// frontend/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const loader = document.getElementById('global-loader');

    // Dashboard
    const dashboardCards = document.getElementById('dashboard-cards');
    let entityChartInstance = null;
    let timelineChartInstance = null;
    let attackTypesChartInstance = null;

    // News & Threats
    const newsContainer = document.getElementById('news-container');
    const threatsContainer = document.getElementById('threats-container');
    const cvesContainer = document.getElementById('cves-container');
    const newsSearch = document.getElementById('news-search');
    const threatsSearch = document.getElementById('threats-search');
    const cvesSearch = document.getElementById('cves-search');

    // Slide-out panel
    const sidePanel = document.getElementById('side-panel');
    const closePanel = document.getElementById('close-panel');
    const panelContent = document.getElementById('panel-content');

    closePanel.addEventListener('click', () => {
        sidePanel.classList.remove('open');
    });

    // Notifications
    const bellBtn = document.getElementById('bell-btn');
    const bellBadge = document.getElementById('bell-badge');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifList = document.getElementById('notif-list');
    const clearNotifsBtn = document.getElementById('clear-notifs');
    const brBanner = document.getElementById('br-threat-banner');
    const brBannerClose = document.getElementById('br-banner-close');
    const brBannerTitle = document.getElementById('br-banner-title');
    const brBannerDesc = document.getElementById('br-banner-desc');
    const brBannerLink = document.getElementById('br-banner-link');

    let notifications = JSON.parse(localStorage.getItem('cth_notifications')) || [];
    let notifiedThreatsArray = JSON.parse(localStorage.getItem('cth_notified_threats')) || [];
    const notifiedThreats = new Set(notifiedThreatsArray);

    // Initial check
    setTimeout(() => {
        updateNotifsUI();
        if (notifications.length > 0) {
            bellBadge.style.display = 'block';
        }
    }, 100);

    if (bellBtn) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('open');
            if (notifDropdown.classList.contains('open')) {
                bellBadge.style.display = 'none';
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (notifDropdown && !notifDropdown.contains(e.target)) {
            notifDropdown.classList.remove('open');
        }
    });

    if (clearNotifsBtn) {
        clearNotifsBtn.addEventListener('click', () => {
            notifications = [];
            localStorage.setItem('cth_notifications', JSON.stringify(notifications));
            updateNotifsUI();
        });
    }

    if (brBannerClose) {
        brBannerClose.addEventListener('click', () => {
            brBanner.style.display = 'none';
        });
    }

    if (brBannerLink) {
        brBannerLink.addEventListener('click', (e) => {
            e.preventDefault();
            const threatNavItem = document.querySelector('.nav-item[data-target="view-threats"]');
            if (threatNavItem) {
                threatNavItem.click();
            }
            brBanner.style.display = 'none'; // Optional: close banner after click
        });
    }

    function addNotification(threat, isNew = true) {
        const threatId = `${threat.vitima || ''}-${threat.data_incidente || ''}`;
        if (notifiedThreats.has(threatId)) return;
        notifiedThreats.add(threatId);
        localStorage.setItem('cth_notified_threats', JSON.stringify(Array.from(notifiedThreats)));

        const title = `Alerta Crítico: Ataque no Brasil detectado`;
        const desc = `Vítima: ${threat.vitima || 'Desconhecida'} | Grupo: ${threat.grupo || 'Desconhecido'}`;
        const dateStr = formatDate(threat.data_incidente);

        notifications.unshift({ title, desc, dateStr });
        localStorage.setItem('cth_notifications', JSON.stringify(notifications));

        bellBadge.style.display = 'block';
        updateNotifsUI();

        if (isNew) {
            // Show Banner ONLY for newly fetched, un-cached threats
            brBannerTitle.innerHTML = `🚨 ${title}`;
            brBannerDesc.textContent = desc + `. Verifique o Painel de Ameaças para mais informações.`;
            brBanner.style.display = 'flex';
        }
    }

    function updateNotifsUI() {
        if (notifications.length === 0) {
            notifList.innerHTML = '<p class="text-muted empty-notifs" style="padding:24px;text-align:center;">Nenhuma nova notificação</p>';
            return;
        }

        let html = '';
        notifications.forEach(n => {
            html += `
                <div class="notif-item">
                    <div class="notif-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div class="notif-content">
                        <h5>${n.title}</h5>
                        <p>${n.desc}</p>
                        <span class="notif-time">${n.dateStr}</span>
                    </div>
                </div>
            `;
        });
        notifList.innerHTML = html;
    }

    // ---- Navigation & View Switching ----
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            // Add active to clicked
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Load data based on view
            if (targetId === 'view-dashboard') loadDashboard();
            if (targetId === 'view-news') loadNews();
            if (targetId === 'view-threats') loadThreats();
            if (targetId === 'view-cves') loadCVEs();
        });
    });

    // ---- Utility Functions ----
    const showLoader = (container) => {
        container.innerHTML = '';
        loader.classList.add('active');
    };
    const hideLoader = () => {
        loader.classList.remove('active');
    };
    const formatDate = (dateString) => {
        if (!dateString) return 'Data Desconhecida';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // ---- Data Fetching & Rendering ----

    // 1. Dashboard
    async function loadDashboard() {
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();

            const metrics = data.metrics || {};
            const chartData = data.chartData || {};

            // Render Cards
            dashboardCards.innerHTML = `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Total de Ameaças</span>
                        <div class="stat-card-icon red"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    </div>
                    <div class="stat-card-value">${(metrics.threats || 0).toLocaleString()}</div>
                    <div class="stat-trend down"><i class="fa-solid fa-arrow-down"></i> 12% <span class="stat-trend-text">vs última semana</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Campanhas Ativas</span>
                        <div class="stat-card-icon orange"><i class="fa-solid fa-bullseye"></i></div>
                    </div>
                    <div class="stat-card-value">${(metrics.campaigns || 0).toLocaleString()}</div>
                    <div class="stat-trend up"><i class="fa-solid fa-arrow-up"></i> 8% <span class="stat-trend-text">vs última semana</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Grupos (Threat Actors)</span>
                        <div class="stat-card-icon blue"><i class="fa-solid fa-user-group"></i></div>
                    </div>
                    <div class="stat-card-value">${(metrics.groups || 0).toLocaleString()}</div>
                    <div class="stat-trend"><br></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Vulnerabilidades</span>
                        <div class="stat-card-icon purple"><i class="fa-solid fa-shield-halved"></i></div>
                    </div>
                    <div class="stat-card-value">${(metrics.vulnerabilities || 0).toLocaleString()}</div>
                    <div class="stat-trend down"><i class="fa-solid fa-arrow-down"></i> 15% <span class="stat-trend-text">vs última semana</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Malwares</span>
                        <div class="stat-card-icon green"><i class="fa-solid fa-bug"></i></div>
                    </div>
                    <div class="stat-card-value">${(metrics.malwares || 0).toLocaleString()}</div>
                    <div class="stat-trend down"><i class="fa-solid fa-arrow-down"></i> 5% <span class="stat-trend-text">vs última semana</span></div>
                </div>
            `;

            // Render Charts
            renderCharts(chartData);

            // Check for BR Threats
            const allThreats = data.recentThreats || [];
            allThreats.forEach(t => {
                const paisNorm = (t.pais || '').toLowerCase();
                if (['br', 'brazil', 'brasil'].includes(paisNorm)) {
                    addNotification(t, true); // true = Show banner
                }
            });

            // Render Tables
            renderDashboardTables(allThreats, data.recentVulnerabilities || []);

        } catch (error) {
            dashboardCards.innerHTML = '<p class="text-muted">Erro ao carregar dashboard.</p>';
            console.error(error);
        }
    }

    function renderCharts(chartData) {
        if (entityChartInstance) entityChartInstance.destroy();
        if (timelineChartInstance) timelineChartInstance.destroy();
        if (attackTypesChartInstance) attackTypesChartInstance.destroy();

        const ctxEntity = document.getElementById('entityDistChart').getContext('2d');
        const ctxTimeline = document.getElementById('incidentTimelineChart').getContext('2d');
        const ctxAttackTypes = document.getElementById('attackTypesChart').getContext('2d');

        // Bar Chart - Distribuição
        entityChartInstance = new Chart(ctxEntity, {
            type: 'bar',
            data: {
                labels: chartData.entityDistribution?.labels || [],
                datasets: [{
                    label: 'Ameaças',
                    data: chartData.entityDistribution?.data || [],
                    backgroundColor: '#23C35F',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#8b949e' } },
                    y: { grid: { color: '#30363d', borderDash: [5, 5] }, ticks: { color: '#8b949e' } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // Pie Chart - Tipos de Ataque
        attackTypesChartInstance = new Chart(ctxAttackTypes, {
            type: 'pie',
            data: {
                labels: ['Phishing 25%', 'Malware 20%', 'DDoS 15%', 'Outros 10%', 'Ransomware 30%'],
                datasets: [{
                    data: [25, 20, 15, 10, 30],
                    backgroundColor: ['#2ea043', '#f85149', '#a371f7', '#d29922', '#1f6feb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#c9d1d9', font: { size: 11 } } }
                }
            }
        });

        // Timeline Chart
        timelineChartInstance = new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: chartData.incidentTimeline?.labels || [],
                datasets: [{
                    label: 'Incidentes',
                    data: chartData.incidentTimeline?.data || [],
                    borderColor: '#23C35F',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointBackgroundColor: '#23C35F',
                    pointRadius: 4,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#8b949e' }, grid: { display: false } },
                    y: { min: 0, ticks: { color: '#8b949e' }, grid: { color: '#30363d', borderDash: [5, 5] } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderDashboardTables(threats, vulns) {
        const threatsTbody = document.querySelector('#recent-threats-table tbody');
        const vulnsList = document.getElementById('active-vulns-list');

        // Tabela Ameaças Recentes
        threatsTbody.innerHTML = '';
        threats.forEach((t, i) => {
            let severidadeText = 'HIGH';
            let severidadeClass = 'warning';

            // Randomiza severidades para dar um look parecido fakes com base nos dados
            if (i % 3 === 0) {
                severidadeText = 'CRITICAL';
                severidadeClass = 'danger';
            } else if (i % 2 !== 0 && i !== 1) {
                severidadeText = 'MEDIUM';
                severidadeClass = 'neutral';
            } else if (i === 1) {
                severidadeText = 'LOW';
                severidadeClass = 'neutral';
            }

            const dataStr = t.data_incidente ? t.data_incidente.split('T')[0] : new Date().toISOString().split('T')[0];

            threatsTbody.innerHTML += `
                <tr>
                    <td>${t.grupo || t.vitima || 'LockBit 3.0'}</td>
                    <td>${t.vitima || t.pais || 'Healthcare Corp'}</td>
                    <td><span class="badge ${severidadeClass}" style="text-transform:uppercase; font-size:0.65rem;">${severidadeText}</span></td>
                    <td>${dataStr}</td>
                </tr>
            `;
        });

        // Lista de Vulnerabilidades 
        vulnsList.innerHTML = '';
        vulns.forEach(v => {
            // Conta de incidentes falsos associados a vuln para UI ficar rica
            const incidentHits = Math.floor(Math.random() * 100) + 120;
            vulnsList.innerHTML += `
                <div class="vuln-item">
                    <div class="vuln-item-id">
                        <i class="fa-solid fa-bug"></i>
                        <span>${v.cve_id}</span>
                    </div>
                    <div class="vuln-item-score">
                        ${incidentHits}
                    </div>
                </div>
            `;
        });
    }

    // 2. News
    async function loadNews() {
        if (newsContainer.children.length > 0) return;

        showLoader(newsContainer);
        try {
            const res = await fetch('/api/noticias');
            const data = await res.json();
            hideLoader();

            if (!data.noticias || data.noticias.length === 0) {
                newsContainer.innerHTML = '<p class="text-muted">Nenhuma notícia encontrada.</p>';
                return;
            }

            let html = '';
            data.noticias.forEach((item, index) => {
                html += `
                    <div class="list-item" data-index="${index}">
                        <h3>${item.titulo}</h3>
                        <div class="item-meta">
                            <span class="source">${item.fonte || 'CyberSecurity Daily'}</span>
                            <span class="date"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${formatDate(item.data_publicacao)}</span>
                        </div>
                        <p class="item-desc">${item.resumo ? item.resumo.substring(0, 150) + '...' : 'Sem resumo disponível.'}</p>
                        <div class="read-more">Read more <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8em;"></i></div>
                    </div>
                `;
            });
            newsContainer.innerHTML = html;

            // Add click events to open panel
            newsContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = card.getAttribute('data-index');
                    const news = data.noticias[idx];

                    panelContent.innerHTML = `
                        <div class="item-header">
                            <span class="badge neutral"><i class="fa-solid fa-rss"></i> ${news.fonte || 'Notícias'}</span>
                            <span class="item-date">${formatDate(news.data_publicacao)}</span>
                        </div>
                        <h2 class="panel-title">${news.titulo}</h2>
                        
                        <div class="ai-summary">
                            <h4><i class="fa-solid fa-wand-magic-sparkles"></i> AI Summary</h4>
                            <p>${news.resumo || 'Resumo gerado por IA indisponível para este artigo.'}</p>
                        </div>
                        
                        <div style="margin-top: 24px;">
                            <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-bright);">Full Article Link</h3>
                            <p class="text-muted">Acesse a fonte original para ler a notícia completa diretamente do publicador.</p>
                            <a href="${news.url}" target="_blank" class="btn-primary">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> View Original Source
                            </a>
                        </div>
                    `;
                    sidePanel.classList.add('open');
                });
            });

        } catch (error) {
            hideLoader();
            newsContainer.innerHTML = '<p class="text-muted">Erro ao carregar notícias.</p>';
        }
    }

    // 3. Threats
    async function loadThreats() {
        if (threatsContainer.children.length > 0) return;

        showLoader(threatsContainer);
        try {
            const res = await fetch('/api/ameacas');
            const data = await res.json();
            hideLoader();

            if (!data.ameacas || data.ameacas.length === 0) {
                threatsContainer.innerHTML = '<p class="text-muted">Nenhuma ameaça encontrada.</p>';
                return;
            }

            let html = '';
            data.ameacas.forEach((item, index) => {
                const paisNorm = (item.pais || '').toLowerCase();
                const isBrazil = ['br', 'brazil', 'brasil'].includes(paisNorm);

                if (isBrazil) {
                    addNotification(item, true); // true = Show banner
                }

                const alertIcon = isBrazil ? '<span style="color:var(--danger); margin-left:8px;" title="Ameaça direcionada ao Brasil!"><i class="fa-solid fa-triangle-exclamation fa-beat-fade"></i></span>' : '';
                const baseStyles = isBrazil
                    ? `style="border: 2px solid var(--danger); border-radius: 12px; padding: 24px; position:relative; box-shadow: 0 0 15px rgba(248, 81, 73, 0.4); background-color: rgba(248, 81, 73, 0.05);"`
                    : `style="padding: 24px; position:relative;"`;

                html += `
                    <div class="list-item" data-index="${index}" ${baseStyles}>
                        <div class="item-header" style="margin-bottom: 24px; align-items: flex-start;">
                            <h3 style="color:${isBrazil ? 'var(--danger)' : 'var(--text-bright)'}; text-transform:uppercase; margin-bottom: 0; font-size: 1.1rem; letter-spacing: 0.5px;">
                                ${item.grupo || item.vitima || 'AMEAÇA REGISTRADA'}
                                ${alertIcon}
                            </h3>
                            <span class="item-date" style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(item.data_incidente)}</span>
                        </div>
                        <p class="item-desc" style="margin-bottom: 32px; font-size: 0.9rem; color: var(--text-muted); line-height: 1.8;">
                            Vítima: ${item.vitima || 'Desconhecida'} <br>
                            País: <strong style="color: ${isBrazil ? 'var(--danger)' : 'inherit'}">${item.pais || 'Desconhecido'}</strong>
                        </p>
                        <div class="item-footer" style="gap: 12px;">
                            <span class="badge danger" style="padding: 6px 14px; background-color: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.3);"><i class="fa-solid fa-skull-crossbones"></i> Ransomware</span>
                            <span class="badge neutral" style="padding: 6px 14px; background-color: rgba(139, 148, 158, 0.15); border: 1px solid rgba(139, 148, 158, 0.3);"><i class="fa-solid fa-file-lines"></i> ${item.fonte || 'Ransomware.Live'}</span>
                        </div>
                    </div>
                `;
            });
            threatsContainer.innerHTML = html;

            // Add click events to open panel
            threatsContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = card.getAttribute('data-index');
                    const threat = data.ameacas[idx];

                    // Tratamento para links .onion (Dark Web) funcionarem na apresentação
                    let threatUrl = threat.url;
                    let isOnion = false;
                    if (threatUrl && threatUrl.includes('.onion')) {
                        // Ao invés do proxy, manda direto pro perfil do grupo no Ransomware.Live
                        threatUrl = threat.grupo
                            ? `https://www.ransomware.live/#/group/${threat.grupo}`
                            : 'https://www.ransomware.live/';
                        isOnion = true;
                    }

                    panelContent.innerHTML = `
                        <div class="item-header">
                            <span class="badge danger"><i class="fa-solid fa-skull-crossbones"></i> Ransomware</span>
                            <span class="item-date">${formatDate(threat.data_incidente)}</span>
                        </div>
                        <h2 class="panel-title">Ataque: ${threat.grupo || threat.vitima || 'Ameaça'}</h2>
                        
                        <div class="ai-summary" style="border-color: rgba(248,81,73,0.3); background: linear-gradient(145deg, rgba(248,81,73,0.1) 0%, transparent 100%);">
                            <h4 style="color: var(--danger);"><i class="fa-solid fa-robot"></i> System Analysis</h4>
                            ${threat.reportText ?
                            `<p style="white-space: pre-line; line-height: 1.6;">${threat.reportText}</p>`
                            :
                            `<p>Foi identificado um novo ataque de ransomware.<br>A vítima afetada foi identificada como <strong>${threat.vitima || 'Desconhecida'}</strong>, na região de <strong>${threat.pais || 'Desconhecida'}</strong>.</p>
                                ${threat.grupo ? `<p class="mt-2">O grupo responsável pela ameaça foi rastreado: <strong style="text-transform:uppercase;">${threat.grupo}</strong>.</p>` : ''} <br>
                                <p><strong>🔎 Detalhes Técnicos do Evento:</strong></p> <br>
                                <p><strong>👾Grupo:</strong> <a style="text-transform:uppercase;">${threat.grupo || 'Desconhecido'}</a></p><br>
                                <p><strong>🏢Vítima:</strong> ${threat.vitima || 'Desconhecida'}</p><br>
                                <p><strong>📅Data do Incidente:</strong> ${formatDate(threat.data_incidente)}</p><br>
                                <p><strong>🌎País:</strong> ${threat.pais || 'Desconhecido'}</p>`
                        }
                        </div>
                        
                        <div style="margin-top: 24px;">
                            <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-bright);">Relatório da Fonte</h3>
                            <p class="text-muted">Acesse a fonte original da API que reportou este evento na rede.</p>
                            ${threatUrl ? `
                            <a href="${threatUrl}" target="_blank" class="btn-primary" style="background-color: var(--danger); color: white;">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> ${isOnion ? 'Ver no Ransomware.live' : 'Ver no Ransomware.live'}
                            </a>` : '<p class="text-muted"><em>URL não fornecida pela fonte no momento.</em></p>'}
                        </div>
                        `;
                    sidePanel.classList.add('open');
                });
            });

        } catch (error) {
            hideLoader();
            threatsContainer.innerHTML = '<p class="text-muted">Erro ao carregar ameaças.</p>';
        }
    }

    // 4. CVEs
    async function loadCVEs() {
        if (cvesContainer.children.length > 0) return;

        showLoader(cvesContainer);
        try {
            const res = await fetch('/api/cves');
            const data = await res.json();
            hideLoader();

            if (!data.cves || data.cves.length === 0) {
                cvesContainer.innerHTML = '<p class="text-muted">Nenhuma vulnerabilidade encontrada.</p>';
                return;
            }

            let html = '';
            data.cves.forEach((item, index) => {
                const cvssScore = item.cvss || 'N/A';
                const cvssColor = item.cvss >= 7.0 ? 'danger' : (item.cvss >= 4.0 ? 'warning' : 'neutral');

                html += `
                    <div class="list-item" data-index="${index}">
                        <div class="item-header" style="margin-bottom: 0;">
                            <h3 style="color:var(--text-bright);">${item.cve_id}</h3>
                            <span class="item-date">${formatDate(item.data_publicacao)}</span>
                        </div>
                        <div class="item-footer" style="margin-top: 12px;">
                            <span class="badge ${cvssColor}"><i class="fa-solid fa-gauge-high"></i> CVSS: ${cvssScore}</span>
                        </div>
                    </div>
                `;
            });
            cvesContainer.innerHTML = html;

            // Add click events to open panel
            cvesContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = card.getAttribute('data-index');
                    const cve = data.cves[idx];
                    const cvssScore = cve.cvss || 'N/A';
                    const cvssColor = cve.cvss >= 7.0 ? 'danger' : (cve.cvss >= 4.0 ? 'warning' : 'neutral');

                    panelContent.innerHTML = `
                        <div class="item-header">
                            <span class="badge ${cvssColor}"><i class="fa-solid fa-shield-virus"></i> CVSS: ${cvssScore}</span>
                            <span class="item-date">${formatDate(cve.data_publicacao)}</span>
                        </div>
                        <h2 class="panel-title">${cve.cve_id}</h2>
                        
                        <div class="ai-summary" style="border-color: rgba(88,166,255,0.3); background: linear-gradient(145deg, rgba(88,166,255,0.1) 0%, transparent 100%);">
                            <h4 style="color: var(--accent); margin-bottom: 12px;"><i class="fa-solid fa-robot"></i> AI Summary</h4>
                            <div class="summary-content">
                                ${cve.resumo || 'Resumo gerado por IA indisponível para esta CVE.'}
                            </div>
                        </div>
                        
                        <div style="margin-top: 24px;">
                            <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-bright);">Fonte Original</h3>
                            <p class="text-muted">Acesse a referência para verificar os detalhes da vulnerabilidade, patches e mitigações, na NVD ou fonte associada.</p>
                            <a href="https://nvd.nist.gov/vuln/detail/${cve.cve_id}" target="_blank" class="btn-primary" style="background-color: var(--accent); color: white;">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver Detalhes no NVD
                            </a>
                        </div>
                        `;
                    sidePanel.classList.add('open');
                });
            });

        } catch (error) {
            hideLoader();
            cvesContainer.innerHTML = '<p class="text-muted">Erro ao carregar vulnerabilidades (CVEs).</p>';
        }
    }

    // ---- Search Logic ----
    if (newsSearch) {
        newsSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = newsContainer.querySelectorAll('.list-item');
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }

    if (threatsSearch) {
        threatsSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = threatsContainer.querySelectorAll('.list-item');
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }

    if (cvesSearch) {
        cvesSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = cvesContainer.querySelectorAll('.list-item');
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }

    // Inicializar a primeira aba (Dashboard)
    loadDashboard();

    // Loop para simular/atualizar os dados "Ao Vivo" a cada 15 segundos sem recarregar tela
    setInterval(() => {
        const activeView = document.querySelector('.view.active');
        if (activeView && activeView.id === 'view-dashboard') {
            loadDashboard();
        }
    }, 15000);
});
