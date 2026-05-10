"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = upload;
exports.deletar = deletar;
const supabase_js_1 = require("@supabase/supabase-js");
const prisma_1 = require("../../lib/prisma");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BUCKET = 'fotos-veiculos';
async function upload(veiculoId, tenantId, arquivo, capa = false) {
    const veiculo = await prisma_1.prisma.veiculo.findFirst({ where: { id: veiculoId, tenantId } });
    if (!veiculo)
        throw new Error('Veículo não encontrado');
    const nomeArquivo = `${tenantId}/${veiculoId}/${Date.now()}-${arquivo.originalname}`;
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(nomeArquivo, arquivo.buffer, { contentType: arquivo.mimetype });
    if (error)
        throw new Error('Erro ao fazer upload da foto');
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo);
    const totalFotos = await prisma_1.prisma.foto.count({ where: { veiculoId } });
    const foto = await prisma_1.prisma.foto.create({
        data: {
            url: data.publicUrl,
            veiculoId,
            capa: capa || totalFotos === 0,
            ordem: totalFotos,
        }
    });
    return foto;
}
async function deletar(fotoId, tenantId) {
    const foto = await prisma_1.prisma.foto.findFirst({
        where: { id: fotoId },
        include: { veiculo: true }
    });
    if (!foto || foto.veiculo.tenantId !== tenantId)
        throw new Error('Foto não encontrada');
    const nomeArquivo = foto.url.split(`${BUCKET}/`)[1];
    if (!nomeArquivo)
        throw new Error('Arquivo da foto não encontrado no bucket');
    await supabase.storage.from(BUCKET).remove([nomeArquivo]);
    await prisma_1.prisma.foto.delete({ where: { id: fotoId } });
}
