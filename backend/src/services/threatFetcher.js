const axios = require('axios');
const db = require('../database/db');
const { sendAttackNotification } = require('./emailService');

function formatDate(dateString) {
    if (!dateString) return 'Data Desconhecida';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric'

    });
}

function generateCTIReport(attack) {
    return `Foi identificado um <strong>novo incidente de ransomware</strong> envolvendo uma organização localizada no <strong style="color: green;">Brasil</strong>.

O evento foi detectado a partir de fontes públicas de inteligência de ameaças e pode indicar atividade recente de grupos de ransomware atuando na região.

<strong>🔎 Detalhes do Incidente:</strong>

👾 Grupo de Ransomware: ${attack.grupo}
🏢 Organização Vítima: ${attack.vitima}
📅 Data da Detecção: ${formatDate(attack.data_incidente)}
🌎 País: Brasil

🔎 Fonte do Incidente:
${attack.url}`;
}

async function updateThreatsFromAPI() {
    console.log('Fetching latest threats from ransomware tracking APIs...');

    try {
        const response = await axios.get('https://api.ransomware.live/recentvictims', {
            timeout: 60000,
            headers: {
                'User-Agent': 'CyberThreatHub-AcademicProject'
            }
        });

        const recentVictims = response.data.slice(0, 100);

        for (const item of recentVictims) {
            const grupo = item.group_name || 'Unknown Actor';
            const vitima = item.post_title || 'Unknown Victim';
            const data_incidente = item.discovered || null;
            const pais = item.country || 'N/A';
            const fonte = 'Ransomware.Live';
            const url = item.post_url || `https://www.ransomware.live/#/group/${grupo}`;

            // Check if this specific threat already exists in the local database
            db.get("SELECT id, email_sent, reportText FROM AMEACA WHERE grupo = ? AND vitima = ? AND data_incidente = ?", [grupo, vitima, data_incidente], async (err, row) => {
                if (err) {
                    console.error('Error checking existing threat:', err);
                    return;
                }

                const paisNorm = pais.toLowerCase();
                const isBR = ['br', 'brazil', 'brasil'].includes(paisNorm);
                let reportText = null;

                if (row) {
                    if (isBR && !row.reportText) {
                        const attackObj = { grupo, vitima, data_incidente, pais, url };
                        reportText = generateCTIReport(attackObj);
                        db.run("UPDATE AMEACA SET reportText = ? WHERE id = ?", [reportText, row.id]);
                    }
                } else {
                    if (isBR) {
                        const attackObj = { grupo, vitima, data_incidente, pais, url };
                        reportText = generateCTIReport(attackObj);
                    }

                    // Threat doesn't exist, insert it
                    const insertQuery = `INSERT INTO AMEACA (grupo, vitima, data_incidente, pais, fonte, url, email_sent, reportText) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`;

                    db.run(insertQuery, [grupo, vitima, data_incidente, pais, fonte, url, reportText], async function (err) {
                        if (err) {
                            console.error('Error inserting threat:', err);
                            return;
                        }

                        const newId = this.lastID;

                        // Check if we need to send an email for this new threat
                        if (isBR) {
                            const threatObj = {
                                grupo: grupo,
                                vitima: vitima,
                                data_incidente: data_incidente,
                                url: url
                            };

                            const emailSuccess = await sendAttackNotification(reportText, threatObj);

                            if (emailSuccess) {
                                db.run("UPDATE AMEACA SET email_sent = 1 WHERE id = ?", [newId], (err) => {
                                    if (err) console.error("Error updating email_sent status:", err);
                                });
                            }
                        }
                    });
                }
            });
        }

        console.log(`Finished processing real threats from API.`);

    } catch (error) {
        console.error('Error fetching threats from API:', error.message);
    }
}

module.exports = { updateThreatsFromAPI };

