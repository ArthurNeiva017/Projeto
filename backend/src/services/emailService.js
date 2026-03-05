const nodemailer = require('nodemailer');
require('dotenv').config();

function formatDate(dateString) {
    if (!dateString) return 'Data Desconhecida';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    family: 4, // Força o uso do IPv4 invés do IPv6 do Render (que causa ENETUNREACH)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendAttackNotification(reportText, attack) {
    const toEmail = process.env.ALERT_EMAIL_TO || 'admin@cyberthreathub.local';

    const subject = `🚨 Alerta de Ataque de Ransomware no Brasil 🚨`;

    const textBody = `🚨 Alerta de Segurança Cibernética – Incidente de Ransomware Detectado 🚨

A plataforma Cyber Threat Hub identificou um novo incidente de ransomware envolvendo uma organização localizada no Brasil.

O evento foi detectado a partir de fontes públicas de inteligência de ameaças e pode indicar atividade recente de grupos de ransomware atuando na região.

🔎 Detalhes do Incidente:

👾 Grupo de Ransomware: ${attack.grupo}
🏢 Organização Vítima: ${attack.vitima}
📅 Data da Detecção: ${formatDate(item.data_incidente)}
🌏 País: Brasil

🔎 Fonte do Incidente:
${attack.url}`;

    try {
        const info = await transporter.sendMail({
            from: `"Cyber Threat Hub" <${process.env.SMTP_USER || 'alert@cyberthreathub.local'}>`,
            to: toEmail,
            subject: subject,
            text: textBody
        });
        console.log("Email de alerta enviado com sucesso: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Erro ao enviar email de notificação:", error);
        return false;
    }
}

module.exports = {
    sendAttackNotification
};
