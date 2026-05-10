import { createClient } from '@supabase/supabase-js'
import { prisma } from '../../lib/prisma'

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_KEY as string
)

const BUCKET = 'fotos-veiculos'

export async function upload(veiculoId: string, tenantId: string, arquivo: Express.Multer.File, capa: boolean = false) {
  const veiculo = await prisma.veiculo.findFirst({ where: { id: veiculoId, tenantId } })
  if (!veiculo) throw new Error('Veículo não encontrado')

  const nomeArquivo = `${tenantId}/${veiculoId}/${Date.now()}-${arquivo.originalname}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nomeArquivo, arquivo.buffer, { contentType: arquivo.mimetype })

  if (error) throw new Error('Erro ao fazer upload da foto')

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo)

  const totalFotos = await prisma.foto.count({ where: { veiculoId } })

  const foto = await prisma.foto.create({
    data: {
      url: data.publicUrl,
      veiculoId,
      capa: capa || totalFotos === 0,
      ordem: totalFotos,
    }
  })

  return foto
}

export async function deletar(fotoId: string, tenantId: string) {
  const foto = await prisma.foto.findFirst({
    where: { id: fotoId },
    include: { veiculo: true }
  })

  if (!foto || foto.veiculo.tenantId !== tenantId) throw new Error('Foto não encontrada')

  const nomeArquivo = foto.url.split(`${BUCKET}/`)[1]
  if (!nomeArquivo) throw new Error('Arquivo da foto não encontrado no bucket')

  await supabase.storage.from(BUCKET).remove([nomeArquivo])
  await prisma.foto.delete({ where: { id: fotoId } })
}
