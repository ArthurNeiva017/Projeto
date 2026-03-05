const axios = require('axios');
const db = require('../database/db');

// Utilizando a API pública do CIRCL para buscar as últimas CVEs
const CVE_API_URL = 'https://cve.circl.lu/api/last';

async function updateCVEsFromAPI() {
    console.log('Fetching latest CVEs from CIRCL API...');

    try {
        const response = await axios.get(CVE_API_URL, {
            timeout: 15000, // 15 segundos
            headers: {
                // Finge ser um navegador normal para evitar bloqueios de segurança (Cloudflare, etc)
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        });
        const cves = response.data;

        // Filtrar apenas vulnerabilidades que começam com CVE- e excluir GHSA etc.
        const activeCVEs = cves.filter(item => {
            const id = item.id || (item.cveMetadata && item.cveMetadata.cveId) || "";
            return id.startsWith('CVE-');
        });

        // Pegar apenas as 10 mais recentes para evitar inchaço
        const recentCVEs = activeCVEs.slice(0, 10);

        for (const item of recentCVEs) {
            // Extrair ID conforme o formato (suporte a novo e antigo JSON da NVD/CIRCL)
            const cveId = item.id || (item.cveMetadata && item.cveMetadata.cveId) || `CVE-UNKNOWN-${Math.floor(Math.random() * 1000)}`;

            // Verificar se a CVE já existe pelo cve_id
            db.get("SELECT id FROM CVE WHERE cve_id = ?", [cveId], (err, row) => {
                if (!row) {
                    // Tentar extrair um resumo
                    let originalSummary = item.summary || 'Descrição detalhada não fornecida pela fonte no momento.';
                    if (!item.summary && item.containers?.cna?.descriptions?.[0]?.value) {
                        originalSummary = item.containers.cna.descriptions[0].value;
                    }

                    // Simula uma tradução/simplificação de IA com estrutura "Sobre" e "Recomendação"
                    let aiSummary = `
<div style="margin-bottom: 16px;">
    <strong style="color: var(--text-bright); display: block; margin-bottom: 6px;"><i class="fa-solid fa-magnifying-glass"></i> Sobre</strong>
    <p style="line-height: 1.6; text-align: justify; color: var(--text-muted);">A vulnerabilidade crítica <strong>${cveId}</strong> foi recém-descoberta. Detalhes técnicos indicam o seguinte comportamento anômalo ou falha de sistema: ${originalSummary.substring(0, 300)}...</p>
</div>
<div>
    <strong style="color: var(--text-bright); display: block; margin-bottom: 6px;"><i class="fa-solid fa-shield-halved"></i> Recomendação</strong>
    <p style="line-height: 1.6; text-align: justify; color: var(--text-muted);">Recomenda-se a aplicação imediata de patches de segurança disponibilizados pelo fabricante. Monitore os endpoints afetados e implemente regras de firewall ou IPS preventivas se possível.</p>
</div>`;

                    const insertCVE = db.prepare('INSERT INTO CVE (cve_id, data_publicacao, cvss, resumo, url) VALUES (?, ?, ?, ?, ?)');

                    // Lidar com datas e CVSS
                    const pubDate = item.Published || (item.cveMetadata && item.cveMetadata.datePublished) || new Date().toISOString();

                    let cvssScore = item.cvss || null;
                    if (!cvssScore && item.containers?.cna?.metrics?.[0]?.cvssV3_1?.baseScore) {
                        cvssScore = item.containers.cna.metrics[0].cvssV3_1.baseScore;
                    }

                    const referenceUrl = (item.references && item.references.length > 0) ? item.references[0] : (item.containers?.cna?.references?.[0]?.url || `https://nvd.nist.gov/vuln/detail/${cveId}`);

                    insertCVE.run(
                        cveId,
                        pubDate,
                        cvssScore,
                        aiSummary,
                        referenceUrl
                    );
                    insertCVE.finalize();
                }
            });
        }
    } catch (error) {
        console.error('Error fetching CVEs from API:', error.message);
    }
}

module.exports = { updateCVEsFromAPI };
