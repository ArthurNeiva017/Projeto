const axios = require('axios');
const db = require('../database/db');

// Utilizando o Catálogo Oficial de Vulnerabilidades Exploradas (KEV) da CISA
// Ele é hospedado em um CDN do governo americano e não bloqueia IPs de Datacenters (Render).
const CVE_API_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

async function updateCVEsFromAPI() {
    console.log('Fetching latest CVEs from CISA KEV Catalog...');

    try {
        const response = await axios.get(CVE_API_URL, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        // A CISA retorna um objeto com uma lista "vulnerabilities"
        const cvesList = response.data.vulnerabilities || [];

        // Ordenar da mais recente adicionada para a mais antiga
        const sortedCVEs = cvesList.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

        // Pegar apenas as 10 mais recentes
        const recentCVEs = sortedCVEs.slice(0, 10);

        for (const item of recentCVEs) {
            const cveId = item.cveID;

            // Verificar se a CVE já existe pelo cve_id no nosso banco
            db.get("SELECT id FROM CVE WHERE cve_id = ?", [cveId], (err, row) => {
                if (!row) {
                    // A CISA Fornece as informações perfeitas para o nosso resumo técnico!
                    const originalSummary = item.shortDescription || 'Detalhes não informados pela fonte oficial.';
                    const requiredAction = item.requiredAction || 'Recomenda-se aplicar os patches do fabricante imediatamente.';

                    // Simula a UI que a gente já usava de "Sobre" e "Recomendação"
                    let aiSummary = `
<div style="margin-bottom: 16px;">
    <strong style="color: var(--text-bright); display: block; margin-bottom: 6px;"><i class="fa-solid fa-magnifying-glass"></i> Sobre</strong>
    <p style="line-height: 1.6; text-align: justify; color: var(--text-muted);">A vulnerabilidade <strong>${cveId}</strong> afetando o produto ${item.vendorProject} ${item.product} foi recém-adicionada ao catálogo de ameaças ativas. Detalhes técnicos indicam: ${originalSummary}</p>
</div>
<div>
    <strong style="color: var(--text-bright); display: block; margin-bottom: 6px;"><i class="fa-solid fa-shield-halved"></i> Recomendação Oficial (CISA)</strong>
    <p style="line-height: 1.6; text-align: justify; color: var(--text-muted);">${requiredAction}</p>
</div>`;

                    const insertCVE = db.prepare('INSERT INTO CVE (cve_id, data_publicacao, cvss, resumo, url) VALUES (?, ?, ?, ?, ?)');

                    // A CISA não lista o CVSS, mas se tá no catálogo de exploits, é crítico.
                    // Podemos colocar um valor mock alto com base na gravidade do KEV.
                    const cvssScore = "Exploit Ativo";
                    const referenceUrl = `https://nvd.nist.gov/vuln/detail/${cveId}`;

                    insertCVE.run(
                        cveId,
                        item.dateAdded,
                        null, // Vamos usar null no bd numérico e o front resolve, ou string se a coluna permitir. Originalmente era numérico/texto? O Front renderiza se for null.
                        aiSummary,
                        referenceUrl
                    );
                    insertCVE.finalize();
                }
            });
        }
    } catch (error) {
        console.error('Error fetching CVEs from CISA KEV API:', error.message);
    }
}

module.exports = { updateCVEsFromAPI };

