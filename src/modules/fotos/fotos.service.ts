import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma'

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_KEY as string
)

const BUCKET = 'fotos-veiculos'
const MAX_PHOTOS_PER_VEHICLE = 20

function detectImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' }
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: 'png', contentType: 'image/png' }
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: 'webp', contentType: 'image/webp' }
  }
  throw new Error('O arquivo enviado não é uma imagem JPEG, PNG ou WebP válida')
}

export async function upload(veiculoId: string, tenantId: string, arquivo: Express.Multer.File, capa: boolean = false) {
  const veiculo = await prisma.veiculo.findFirst({ where: { id: veiculoId, tenantId } })
  if (!veiculo) throw new Error('Veículo não encontrado')

  const totalFotos = await prisma.foto.count({ where: { veiculoId } })
  if (totalFotos >= MAX_PHOTOS_PER_VEHICLE) throw new Error('Limite de 20 fotos por veículo atingido')

  const imageType = detectImageType(arquivo.buffer)
  const nomeArquivo = `${tenantId}/${veiculoId}/${randomUUID()}.${imageType.extension}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nomeArquivo, arquivo.buffer, { contentType: imageType.contentType, upsert: false })

  if (error) throw new Error('Erro ao fazer upload da foto')

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo)

  try {
    return await prisma.$transaction(async tx => {
      const shouldBeCover = capa || totalFotos === 0
      if (shouldBeCover) {
        await tx.foto.updateMany({ where: { veiculoId }, data: { capa: false } })
      }

      return tx.foto.create({
        data: {
          url: data.publicUrl,
          veiculoId,
          capa: shouldBeCover,
          ordem: totalFotos,
        }
      })
    })
  } catch {
    await supabase.storage.from(BUCKET).remove([nomeArquivo])
    throw new Error('Erro ao registrar a foto')
  }
}

export async function deletar(fotoId: string, tenantId: string) {
  const foto = await prisma.foto.findFirst({
    where: { id: fotoId },
    include: { veiculo: true }
  })

  if (!foto || foto.veiculo.tenantId !== tenantId) throw new Error('Foto não encontrada')

  const nomeArquivo = foto.url.split(`${BUCKET}/`)[1]
  if (!nomeArquivo) throw new Error('Arquivo da foto não encontrado no bucket')

  const { error } = await supabase.storage.from(BUCKET).remove([nomeArquivo])
  if (error) throw new Error('Erro ao remover arquivo da foto')
  await prisma.foto.delete({ where: { id: fotoId } })
}

//definicao de capa de card pelo admin

export async function definirCapa(fotoId: string, tenantId: string) {
  const foto = await prisma.foto.findFirst({
    where: { id: fotoId },
    include: { veiculo: true }
  })

  if (!foto || foto.veiculo.tenantId !== tenantId) throw new Error('Foto não encontrada')

  // remove capa de todas as fotos do veículo
  await prisma.foto.updateMany({
    where: { veiculoId: foto.veiculoId },
    data: { capa: false }
  })

  // define a nova capa
  return prisma.foto.update({
    where: { id: fotoId },
    data: { capa: true }
  })
}
