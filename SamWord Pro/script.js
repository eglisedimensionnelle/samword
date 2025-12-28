// État global de l'application
const appState = {
    currentMode: 'simple',
    theme: 'light',
    musicPlaying: false,
    currentDocument: '',
    zoom: 100,
    currentStyles: {
        fontFamily: 'Inter',
        fontSize: '12',
        color: '#0f172a'
    },
    selectedFormat: null,
    // Gestion de la musique
    playlist: [],
    currentTrackIndex: 0,
    shuffle: false,
    repeat: false,
    volume: 0.5
};

// Formats personnalisés
const CUSTOM_FORMATS = {
    hsjf: { name: 'HSJF', desc: 'Document SamEditeur standard', icon: 'fa-file-word', type: 'document' },
    klpx: { name: 'KLPX', desc: 'Document avec macros', icon: 'fa-file-code', type: 'document' },
    mntb: { name: 'MNTB', desc: 'Modèle SamEditeur', icon: 'fa-copy', type: 'template' },
    qrzd: { name: 'QRZD', desc: 'Modèle avec macros', icon: 'fa-cogs', type: 'template' },
    pdf: { name: 'PDF', desc: 'Format Portable', icon: 'fa-file-pdf', type: 'export' },
    html: { name: 'HTML', desc: 'Page Web standard', icon: 'fa-file-code', type: 'web' },
    wxyz: { name: 'WXYZ', desc: 'Archive Web complète', icon: 'fa-archive', type: 'web' },
    abcd: { name: 'ABCD', desc: 'Archive Web MIME', icon: 'fa-file-archive', type: 'web' },
    efgh: { name: 'EFGH', desc: 'Rich Text Format', icon: 'fa-file-text', type: 'text' },
    ijkl: { name: 'IJKL', desc: 'Données structurées', icon: 'fa-code', type: 'data' },
    mnop: { name: 'MNOP', desc: 'OpenDocument Text', icon: 'fa-file-contract', type: 'document' },
    txt: { name: 'TXT', desc: 'Texte brut', icon: 'fa-file-lines', type: 'text' }
};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-interface').classList.remove('hidden');
        
        initializeEditor();
        initializeMusic();
        loadSettings();
        updateCounters();
        initializeEventListeners();
        
        updateAIStatus('Système prêt - Mode Duo activé');
    }, 2500);
}

function initializeEditor() {
    const editors = document.querySelectorAll('.editor');
    
    editors.forEach(editor => {
        editor.addEventListener('input', updateCounters);
        editor.addEventListener('paste', handlePaste);
        editor.addEventListener('keydown', handleKeyCommands);
        editor.addEventListener('focus', () => editor.classList.add('focused'));
        editor.addEventListener('blur', () => editor.classList.remove('focused'));
    });
    
    document.getElementById('font-family').value = appState.currentStyles.fontFamily;
    document.getElementById('font-size').value = appState.currentStyles.fontSize;
}

function initializeMusic() {
    const audio = document.getElementById('background-music');
    const volumeSlider = document.getElementById('volume-slider');
    
    // Événements pour le lecteur audio
    audio.addEventListener('loadedmetadata', function() {
        updateMusicUI();
    });
    
    audio.addEventListener('ended', function() {
        nextTrack();
    });
    
    audio.addEventListener('timeupdate', function() {
        updateMusicProgress();
    });
    
    // Volume initial
    audio.volume = appState.volume;
    if (volumeSlider) {
        volumeSlider.value = appState.volume * 100;
    }
    
    // Gestion du drag and drop pour les fichiers audio
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-color)';
            uploadArea.style.background = 'var(--background-tertiary)';
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border-color)';
            uploadArea.style.background = 'var(--background-secondary)';
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border-color)';
            uploadArea.style.background = 'var(--background-secondary)';
            
            const files = e.dataTransfer.files;
            handleMusicFiles(files);
        });
    }
    
    // Gestion de l'upload via input file
    const musicUpload = document.getElementById('music-upload');
    if (musicUpload) {
        musicUpload.addEventListener('change', function(e) {
            handleMusicFiles(e.target.files);
        });
    }
}

function handleMusicFiles(files) {
    for (let file of files) {
        if (file.type.startsWith('audio/')) {
            const url = URL.createObjectURL(file);
            const track = {
                name: file.name.replace(/\.[^/.]+$/, ""), // Retirer l'extension
                artist: 'Utilisateur',
                url: url,
                file: file,
                duration: '0:00'
            };
            
            appState.playlist.push(track);
            
            // Créer un audio temporaire pour obtenir la durée
            const audio = new Audio();
            audio.src = url;
            audio.addEventListener('loadedmetadata', function() {
                track.duration = formatTime(audio.duration);
                updatePlaylistUI();
            });
        }
    }
    
    updatePlaylistUI();
    
    // Si c'est la première piste ajoutée, la lire automatiquement
    if (appState.playlist.length === 1) {
        playTrack(0);
    }
    
    updateAIStatus(`${files.length} fichier(s) audio ajouté(s) à la playlist`);
}

function updatePlaylistUI() {
    const playlistElement = document.getElementById('playlist');
    
    if (appState.playlist.length === 0) {
        playlistElement.innerHTML = `
            <div class="empty-playlist">
                <i class="fas fa-music"></i>
                <p>Aucune musique dans la playlist</p>
                <small>Ajoutez des fichiers audio pour commencer</small>
            </div>
        `;
        return;
    }
    
    playlistElement.innerHTML = appState.playlist.map((track, index) => `
        <div class="track-item ${index === appState.currentTrackIndex ? 'active' : ''}" 
             onclick="playTrack(${index})">
            <div class="track-icon">
                <i class="fas fa-music"></i>
            </div>
            <div class="track-info-playlist">
                <div class="track-title-playlist">${track.name}</div>
                <div class="track-artist-playlist">${track.artist}</div>
            </div>
            <div class="track-duration">${track.duration}</div>
            <div class="track-actions">
                <button class="track-action-btn" onclick="event.stopPropagation(); removeTrack(${index})" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateMusicUI() {
    const audio = document.getElementById('background-music');
    const currentTrack = appState.playlist[appState.currentTrackIndex];
    
    if (currentTrack) {
        document.getElementById('current-track').textContent = currentTrack.name;
        document.getElementById('current-artist').textContent = currentTrack.artist;
        document.getElementById('current-music').textContent = `${currentTrack.name} - ${currentTrack.artist}`;
    } else {
        document.getElementById('current-track').textContent = 'Aucune piste';
        document.getElementById('current-artist').textContent = 'SamEditeur Pro';
        document.getElementById('current-music').textContent = 'Musique arrêtée';
    }
    
    // Mettre à jour l'icône play/pause
    const playPauseIcon = document.getElementById('play-pause-icon');
    if (playPauseIcon) {
        playPauseIcon.className = appState.musicPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
    
    // Mettre à jour le bouton de contrôle principal
    const musicControlBtn = document.getElementById('music-control-btn');
    if (musicControlBtn) {
        musicControlBtn.innerHTML = appState.musicPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }
}

function updateMusicProgress() {
    // Pour une future barre de progression détaillée
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Contrôles musique
function playTrack(index) {
    if (appState.playlist.length === 0) return;
    
    appState.currentTrackIndex = index;
    const audio = document.getElementById('background-music');
    const track = appState.playlist[index];
    
    audio.src = track.url;
    audio.play().then(() => {
        appState.musicPlaying = true;
        updateMusicUI();
        updatePlaylistUI();
    }).catch(error => {
        console.error('Erreur lecture audio:', error);
        updateAIStatus('Erreur de lecture audio');
    });
}

function toggleMusic() {
    const audio = document.getElementById('background-music');
    
    if (appState.playlist.length === 0) {
        showMusicManager();
        return;
    }
    
    if (appState.musicPlaying) {
        audio.pause();
        appState.musicPlaying = false;
    } else {
        if (!audio.src && appState.playlist.length > 0) {
            playTrack(appState.currentTrackIndex);
        } else {
            audio.play();
            appState.musicPlaying = true;
        }
    }
    
    updateMusicUI();
}

function nextTrack() {
    if (appState.playlist.length === 0) return;
    
    if (appState.shuffle) {
        appState.currentTrackIndex = Math.floor(Math.random() * appState.playlist.length);
    } else {
        appState.currentTrackIndex = (appState.currentTrackIndex + 1) % appState.playlist.length;
    }
    
    playTrack(appState.currentTrackIndex);
}

function previousTrack() {
    if (appState.playlist.length === 0) return;
    
    appState.currentTrackIndex = appState.currentTrackIndex > 0 ? appState.currentTrackIndex - 1 : appState.playlist.length - 1;
    playTrack(appState.currentTrackIndex);
}

function changeVolume(value) {
    const audio = document.getElementById('background-music');
    appState.volume = value / 100;
    audio.volume = appState.volume;
}

function removeTrack(index) {
    appState.playlist.splice(index, 1);
    
    if (appState.currentTrackIndex >= index && appState.currentTrackIndex > 0) {
        appState.currentTrackIndex--;
    }
    
    if (appState.playlist.length === 0) {
        const audio = document.getElementById('background-music');
        audio.pause();
        audio.src = '';
        appState.musicPlaying = false;
    } else if (appState.currentTrackIndex === index) {
        playTrack(appState.currentTrackIndex);
    }
    
    updatePlaylistUI();
    updateMusicUI();
}

function clearPlaylist() {
    if (confirm('Voulez-vous vider toute la playlist ?')) {
        appState.playlist = [];
        const audio = document.getElementById('background-music');
        audio.pause();
        audio.src = '';
        appState.musicPlaying = false;
        appState.currentTrackIndex = 0;
        
        updatePlaylistUI();
        updateMusicUI();
        updateAIStatus('Playlist vidée');
    }
}

function toggleShuffle() {
    appState.shuffle = !appState.shuffle;
    updateAIStatus(`Mode aléatoire ${appState.shuffle ? 'activé' : 'désactivé'}`);
}

function toggleRepeat() {
    appState.repeat = !appState.repeat;
    const audio = document.getElementById('background-music');
    audio.loop = appState.repeat;
    updateAIStatus(`Mode répétition ${appState.repeat ? 'activé' : 'désactivé'}`);
}

function showMusicManager() {
    updatePlaylistUI();
    showModal('music-modal');
}

// Gestion des modes
function switchMode(mode) {
    appState.currentMode = mode;
    
    // Mettre à jour les boutons
    document.getElementById('simple-mode-btn').classList.toggle('active', mode === 'simple');
    document.getElementById('duo-mode-btn').classList.toggle('active', mode === 'duo');
    
    // Afficher le mode correspondant
    document.getElementById('simple-mode').classList.toggle('active', mode === 'simple');
    document.getElementById('duo-mode').classList.toggle('active', mode === 'duo');
    
    updateCounters();
    updateAIStatus('Mode ' + (mode === 'simple' ? 'Standard' : 'Duo') + ' activé');
}

// Fonctions pour le mode duo
function clearPanel(side) {
    const editor = side === 'left' ? document.getElementById('editor-left') : document.getElementById('editor-right');
    if (confirm(`Vider le contenu du panneau ${side === 'left' ? 'gauche' : 'droit'} ?`)) {
        editor.innerHTML = '<p>Contenu vidé...</p>';
        updateCounters();
        updateAIStatus(`Panneau ${side === 'left' ? 'gauche' : 'droit'} vidé`);
    }
}

function swapPanels() {
    const leftContent = document.getElementById('editor-left').innerHTML;
    const rightContent = document.getElementById('editor-right').innerHTML;
    
    document.getElementById('editor-left').innerHTML = rightContent;
    document.getElementById('editor-right').innerHTML = leftContent;
    
    updateAIStatus('Contenu des panneaux échangé');
}

function syncPanels() {
    const leftContent = document.getElementById('editor-left').innerHTML;
    document.getElementById('editor-right').innerHTML = leftContent;
    
    updateAIStatus('Panneaux synchronisés');
}

function mergePanels() {
    const leftContent = document.getElementById('editor-left').innerHTML;
    const rightContent = document.getElementById('editor-right').innerHTML;
    
    const mergedContent = leftContent + '<hr style="margin: 20px 0; border-color: var(--border-color);">' + rightContent;
    document.getElementById('editor-left').innerHTML = mergedContent;
    document.getElementById('editor-right').innerHTML = '<p>Contenu fusionné dans le panneau gauche</p>';
    
    updateAIStatus('Panneaux fusionnés');
}

function exportPanel(side) {
    const editor = side === 'left' ? document.getElementById('editor-left') : document.getElementById('editor-right');
    const content = editor.innerHTML;
    const filename = `panneau-${side}-${new Date().getTime()}.html`;
    
    const blob = new Blob([content], { type: 'text/html' });
    saveAs(blob, filename);
    
    updateAIStatus(`Panneau ${side === 'left' ? 'gauche' : 'droit'} exporté`);
}

function initializeEventListeners() {
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-group')) {
            document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }
    });
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(performSearch, 300));
    }
    
    window.addEventListener('beforeunload', function(e) {
        saveSettings();
    });
    
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('search-input').focus();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            showSaveModal();
        }
        // Raccourcis musique
        if (e.code === 'Space' && !e.target.isContentEditable) {
            e.preventDefault();
            toggleMusic();
        }
    });
}

// Fonctions de formatage
function execCommand(command, value = null) {
    document.execCommand(command, false, value);
}

function changeFontFamily(font) {
    execCommand('fontName', font);
    appState.currentStyles.fontFamily = font;
}

function changeFontSize(size) {
    if (size === 'increase') {
        execCommand('increaseFontSize');
    } else if (size === 'decrease') {
        execCommand('decreaseFontSize');
    } else {
        execCommand('fontSize', size);
    }
    appState.currentStyles.fontSize = size;
}

function changeTextColor() {
    const color = prompt('Entrez la couleur (hex, rgb, ou nom):', '#0f172a');
    if (color) {
        execCommand('foreColor', color);
        appState.currentStyles.color = color;
    }
}

function changeHighlightColor() {
    const color = prompt('Entrez la couleur de surlignage:', '#fef3c7');
    if (color) {
        execCommand('hiliteColor', color);
    }
}

function increaseIndent() {
    execCommand('indent');
}

function decreaseIndent() {
    execCommand('outdent');
}

function clearFormatting() {
    execCommand('removeFormat');
    execCommand('unlink');
    updateAIStatus('Mise en forme effacée');
}

// Navigation et menus
function toggleDropdown(menuId) {
    const dropdown = document.getElementById(menuId);
    const isVisible = dropdown.style.display === 'block';
    
    document.querySelectorAll('.nav-dropdown').forEach(dd => {
        dd.style.display = 'none';
    });
    
    dropdown.style.display = isVisible ? 'none' : 'block';
}

// Gestion des fichiers
function newDocument() {
    if (confirm('Voulez-vous créer un nouveau document ? Les modifications non enregistrées seront perdues.')) {
        getActiveEditor().innerHTML = `
            <h1 style="text-align: center; color: #2563eb; margin-bottom: 30px; font-weight: 700;">Nouveau Document</h1>
            <p style="text-align: center; color: #64748b; font-size: 1.1em;">Commencez à rédiger votre contenu ici...</p>
        `;
        updateCounters();
        updateAIStatus('Nouveau document créé');
    }
}

function openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.html,.hsjf,.klpx';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                getActiveEditor().innerHTML = e.target.result;
                updateCounters();
                updateAIStatus(`Document "${file.name}" ouvert`);
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}

// Système d'exportation
function showSaveModal() {
    appState.selectedFormat = null;
    showModal('export-modal');
}

function exportDocument(format) {
    appState.selectedFormat = format;
    const formatInfo = CUSTOM_FORMATS[format];
    updateAIStatus(`Préparation de l'export ${formatInfo.name}...`);
}

function startExport() {
    if (!appState.selectedFormat) {
        alert('Veuillez sélectionner un format d\'exportation');
        return;
    }
    
    closeModal('export-modal');
    showProgressModal();
    
    const filename = document.getElementById('export-filename').value || 'document-samediteur';
    const title = document.getElementById('document-title').value || 'Document SamEditeur Pro';
    const author = document.getElementById('document-author').value || 'Utilisateur SamEditeur';
    
    simulateExportProgress(appState.selectedFormat, filename, title, author);
}

function quickExport(format) {
    appState.selectedFormat = format;
    const filename = `document-samediteur-${new Date().getTime()}`;
    const title = 'Document SamEditeur Pro';
    const author = 'Utilisateur SamEditeur';
    
    showProgressModal();
    simulateExportProgress(format, filename, title, author);
}

function simulateExportProgress(format, filename, title, author) {
    const formatInfo = CUSTOM_FORMATS[format];
    let progress = 0;
    const totalSteps = 5;
    
    document.getElementById('detail-format').textContent = `Format: ${formatInfo.name}`;
    document.getElementById('progress-message').textContent = `Export ${formatInfo.name} en cours...`;
    
    const interval = setInterval(() => {
        progress += 20;
        updateExportProgress(progress, `Étape ${Math.floor(progress/20)}/${totalSteps}`);
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                completeExport(format, filename, title, author);
            }, 500);
        }
    }, 300);
}

function updateExportProgress(percent, message) {
    document.getElementById('export-progress').style.width = percent + '%';
    document.getElementById('progress-text').textContent = percent + '%';
    document.getElementById('progress-message').textContent = message;
}

function completeExport(format, filename, title, author) {
    let content, textContent;
    
    if (appState.currentMode === 'simple') {
        content = getActiveEditor().innerHTML;
        textContent = getActiveEditor().innerText || getActiveEditor().textContent;
    } else {
        // En mode duo, exporter les deux panneaux
        const leftContent = document.getElementById('editor-left').innerHTML;
        const rightContent = document.getElementById('editor-right').innerHTML;
        content = `
            <div class="duo-export">
                <div class="panel left-panel">
                    <h3>Panneau Principal</h3>
                    ${leftContent}
                </div>
                <div class="panel right-panel">
                    <h3>Panneau Secondaire</h3>
                    ${rightContent}
                </div>
            </div>
        `;
        const leftText = document.getElementById('editor-left').innerText || document.getElementById('editor-left').textContent;
        const rightText = document.getElementById('editor-right').innerText || document.getElementById('editor-right').textContent;
        textContent = `PANEAU PRINCIPAL:\n${leftText}\n\nPANEAU SECONDAIRE:\n${rightText}`;
    }
    
    let blob, fullFilename;
    
    switch (format) {
        case 'hsjf':
        case 'klpx':
        case 'mntb':
        case 'qrzd':
            blob = generateCustomDocx(content, title, author, format);
            fullFilename = `${filename}.${format}`;
            break;
        case 'pdf':
            generatePdf(content, filename);
            closeModal('progress-modal');
            return;
        case 'html':
            blob = new Blob([generateHtml(content, title, author)], { type: 'text/html' });
            fullFilename = `${filename}.html`;
            break;
        case 'wxyz':
        case 'abcd':
            blob = new Blob([generateMht(content, title)], { type: 'message/rfc822' });
            fullFilename = `${filename}.${format}`;
            break;
        case 'efgh':
            blob = new Blob([generateRtf(textContent)], { type: 'application/rtf' });
            fullFilename = `${filename}.${format}`;
            break;
        case 'ijkl':
            blob = new Blob([generateXml(content, title, author)], { type: 'application/xml' });
            fullFilename = `${filename}.${format}`;
            break;
        case 'mnop':
            blob = generateOdt(content, title, author);
            fullFilename = `${filename}.${format}`;
            break;
        case 'txt':
            blob = new Blob([textContent], { type: 'text/plain' });
            fullFilename = `${filename}.txt`;
            break;
        default:
            blob = new Blob([content], { type: 'text/html' });
            fullFilename = `${filename}.html`;
    }
    
    if (blob) {
        saveAs(blob, fullFilename);
    }
    
    closeModal('progress-modal');
    updateAIStatus(`Document exporté en ${CUSTOM_FORMATS[format].name}`);
}

// Générateurs de formats personnalisés
function generateCustomDocx(content, title, author, format) {
    const docxContent = `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <CustomDocument xmlns="http://schemas.samediteur.pro/custom/2026">
            <metadata>
                <title>${title}</title>
                <author>${author}</author>
                <created>${new Date().toISOString()}</created>
                <format>${format}</format>
                <generator>SamEditeur Pro</generator>
            </metadata>
            <content>
                <![CDATA[${content}]]>
            </content>
        </CustomDocument>
    `;
    
    return new Blob([docxContent], { 
        type: 'application/vnd.samediteur.pro.document' 
    });
}

function generatePdf(content, filename) {
    const element = document.createElement('div');
    element.innerHTML = content;
    
    const opt = {
        margin: 10,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        closeModal('progress-modal');
        updateAIStatus('PDF généré avec succès');
    });
}

function generateHtml(content, title, author) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="author" content="${author}">
    <meta name="generator" content="SamWord Pro">
    <style>
        body { 
            font-family: 'Inter', Arial, sans-serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            color: #333;
        }
        .document-info { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px; 
            border-left: 4px solid #2563eb;
        }
        .duo-export {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .panel {
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
        }
    </style>
</head>
<body>
    <div class="document-info">
        <h1>${title}</h1>
        <p><strong>Auteur:</strong> ${author}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        <p><strong>Généré avec:</strong> SamEditeur Pro</p>
    </div>
    <div class="content">
        ${content}
    </div>
</body>
</html>`;
}

function generateRtf(content) {
    return `{\\rtf1\\ansi\\deff0
{\\fonttbl {\\f0 Times New Roman;}}
{\\info
{\\title Document SamEditeur Pro}
{\\author Utilisateur SamEditeur}
{\\creatim\\yr2026\\mo1\\dy1\\hr0\\min0}
}
\\f0\\fs24
${content.replace(/\n/g, '\\par ')}
}`;
}

function generateMht(content, title) {
    return `From: <samediteur@pro.com>
Subject: ${title}
Date: ${new Date().toUTCString()}
MIME-Version: 1.0
Content-Type: multipart/related; boundary="SAMEDITEUR_BOUNDARY"

--SAMEDITEUR_BOUNDARY
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: 7bit

<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
</head>
<body>
${content}
</body>
</html>

--SAMEDITEUR_BOUNDARY--`;
}

function generateXml(content, title, author) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<document>
    <metadata>
        <title>${title}</title>
        <author>${author}</author>
        <created>${new Date().toISOString()}</created>
        <generator>SamWord Pro</generator>
    </metadata>
    <content>
        <![CDATA[${content}]]>
    </content>
</document>`;
}

function generateOdt(content, title, author) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0">
    <office:body>
        <office:text>
            <text:p text:style-name="Title">${title}</text:p>
            <text:p text:style-name="Author">Auteur: ${author}</text:p>
            <text:p text:style-name="Date">Date: ${new Date().toLocaleDateString('fr-FR')}</text:p>
            <text:p>Contenu exporté depuis SamEditeur Pro</text:p>
        </office:text>
    </office:body>
</office:document-content>`;
}

// Fonctions utilitaires
function getActiveEditor() {
    if (appState.currentMode === 'simple') {
        return document.getElementById('editor');
    } else {
        return document.getElementById('editor-left');
    }
}

function updateCounters() {
    let totalWords = 0;
    let totalChars = 0;
    
    if (appState.currentMode === 'simple') {
        const editor = document.getElementById('editor');
        const text = editor.innerText || editor.textContent;
        totalWords = text.trim() ? text.trim().split(/\s+/).length : 0;
        totalChars = text.length;
    } else {
        // Mode duo - compter les deux panneaux
        const leftText = document.getElementById('editor-left').innerText || document.getElementById('editor-left').textContent;
        const rightText = document.getElementById('editor-right').innerText || document.getElementById('editor-right').textContent;
        const combinedText = leftText + ' ' + rightText;
        totalWords = combinedText.trim() ? combinedText.trim().split(/\s+/).length : 0;
        totalChars = combinedText.length;
    }
    
    const readingTime = Math.ceil(totalWords / 200);
    
    document.getElementById('word-count').textContent = `${totalWords} mots`;
    document.getElementById('char-count').textContent = `${totalChars} caractères`;
    document.getElementById('sidebar-word-count').textContent = `${totalWords} mots`;
    document.getElementById('sidebar-char-count').textContent = `${totalChars} caractères`;
    document.getElementById('reading-time').textContent = `${readingTime} min`;
}

function updateAIStatus(message) {
    const aiStatus = document.getElementById('ai-status');
    aiStatus.querySelector('span').textContent = message;
    
    aiStatus.style.animation = 'none';
    setTimeout(() => {
        aiStatus.style.animation = 'statusPulse 0.6s ease';
    }, 10);
}

function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
}

function handleKeyCommands(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'b':
                e.preventDefault();
                execCommand('bold');
                break;
            case 'i':
                e.preventDefault();
                execCommand('italic');
                break;
            case 'u':
                e.preventDefault();
                execCommand('underline');
                break;
            case 'z':
                e.preventDefault();
                execCommand('undo');
                break;
            case 'y':
                e.preventDefault();
                execCommand('redo');
                break;
            case 's':
                e.preventDefault();
                showSaveModal();
                break;
            case 'n':
                e.preventDefault();
                newDocument();
                break;
            case 'o':
                e.preventDefault();
                openFile();
                break;
        }
    }
}

// Recherche
function performSearch() {
    const searchTerm = document.getElementById('search-input').value;
    if (searchTerm) {
        const editor = getActiveEditor();
        const content = editor.innerHTML;
        const regex = new RegExp(searchTerm, 'gi');
        const highlighted = content.replace(regex, match => 
            `<span style="background: var(--accent-color); padding: 2px 4px; border-radius: 2px; color: white;">${match}</span>`
        );
        editor.innerHTML = highlighted;
        updateAIStatus(`Recherche: "${searchTerm}" - ${(content.match(regex) || []).length} occurence(s)`);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Zoom
function zoomIn() {
    appState.zoom = Math.min(appState.zoom + 10, 200);
    updateZoom();
}

function zoomOut() {
    appState.zoom = Math.max(appState.zoom - 10, 50);
    updateZoom();
}

function setZoom(value) {
    appState.zoom = parseInt(value);
    updateZoom();
}

function updateZoom() {
    const editor = getActiveEditor();
    editor.style.transform = `scale(${appState.zoom / 100})`;
    editor.style.transformOrigin = 'top left';
    
    const zoomSelect = document.querySelector('.zoom-select');
    if (zoomSelect) {
        zoomSelect.value = appState.zoom;
    }
    
    updateAIStatus(`Zoom: ${appState.zoom}%`);
}

// Gestion des modals
function showModal(modalId) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById(modalId).classList.remove('hidden');
}

function showProgressModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('progress-modal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Gestion des thèmes
function toggleTheme() {
    appState.theme = appState.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', appState.theme);
    
    const themeBtn = document.getElementById('theme-btn');
    themeBtn.innerHTML = appState.theme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    
    saveSettings();
    updateAIStatus('Thème ' + (appState.theme === 'light' ? 'clair' : 'sombre') + ' activé');
}

// Sauvegarde/chargement des paramètres
function saveSettings() {
    const settings = {
        theme: appState.theme,
        zoom: appState.zoom,
        styles: appState.currentStyles,
        music: {
            volume: appState.volume,
            shuffle: appState.shuffle,
            repeat: appState.repeat
        }
    };
    localStorage.setItem('samediteur-pro-settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('samediteur-pro-settings');
    if (saved) {
        const settings = JSON.parse(saved);
        appState.theme = settings.theme || 'light';
        appState.zoom = settings.zoom || 100;
        appState.currentStyles = settings.styles || appState.currentStyles;
        
        if (settings.music) {
            appState.volume = settings.music.volume || 0.5;
            appState.shuffle = settings.music.shuffle || false;
            appState.repeat = settings.music.repeat || false;
        }
        
        document.documentElement.setAttribute('data-theme', appState.theme);
        updateZoom();
        
        // Appliquer les paramètres musique
        const audio = document.getElementById('background-music');
        audio.volume = appState.volume;
        audio.loop = appState.repeat;
        
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.value = appState.volume * 100;
        }
        
        const shuffleCheckbox = document.getElementById('shuffle-mode');
        const repeatCheckbox = document.getElementById('repeat-mode');
        if (shuffleCheckbox) shuffleCheckbox.checked = appState.shuffle;
        if (repeatCheckbox) repeatCheckbox.checked = appState.repeat;
    }
}

// Synthèse vocale IA
function textToSpeech() {
    const selection = window.getSelection();
    let text = selection.toString();
    
    if (!text) {
        text = getActiveEditor().innerText || getActiveEditor().textContent;
    }
    
    if (!text.trim()) {
        alert('Aucun texte à lire');
        return;
    }
    
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        const voices = speechSynthesis.getVoices();
        const frenchVoice = voices.find(voice => 
            voice.lang.includes('fr') && voice.name.toLowerCase().includes('female')
        ) || voices.find(voice => voice.lang.includes('fr'));
        
        if (frenchVoice) {
            utterance.voice = frenchVoice;
        }
        
        utterance.onstart = () => {
            updateAIStatus('Lecture en cours...');
        };
        
        utterance.onend = () => {
            updateAIStatus('Lecture terminée');
        };
        
        speechSynthesis.speak(utterance);
    } else {
        alert('La synthèse vocale n\'est pas supportée par votre navigateur');
    }
}

// Insertions
function insertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.borderRadius = '8px';
                img.style.boxShadow = 'var(--shadow-md)';
                img.style.margin = '16px 0';
                
                execCommand('insertHTML', img.outerHTML);
                updateAIStatus('Image insérée');
            };
            reader.readAsDataURL(file);
        }
    };
    
    input.click();
}

function insertTable() {
    const rows = prompt('Nombre de lignes:', '3');
    const cols = prompt('Nombre de colonnes:', '3');
    
    if (rows && cols) {
        let tableHTML = `
            <table style="
                border-collapse: collapse; 
                width: 100%; 
                margin: 16px 0; 
                border: 1px solid var(--border-color);
                box-shadow: var(--shadow-sm);
            ">
        `;
        
        for (let i = 0; i < rows; i++) {
            tableHTML += '<tr>';
            for (let j = 0; j < cols; j++) {
                tableHTML += `
                    <td style="
                        border: 1px solid var(--border-color); 
                        padding: 12px; 
                        text-align: left;
                    ">&nbsp;</td>
                `;
            }
            tableHTML += '</tr>';
        }
        
        tableHTML += '</table>';
        
        execCommand('insertHTML', tableHTML);
        updateAIStatus(`Tableau ${rows}x${cols} inséré`);
    }
}

function insertShape() {
    const shapes = [
        { 
            name: 'rectangle', 
            html: '<div style="width: 120px; height: 80px; background: var(--primary-color); border-radius: 8px; margin: 16px; display: inline-block;"></div>' 
        },
        { 
            name: 'circle', 
            html: '<div style="width: 80px; height: 80px; background: var(--accent-color); border-radius: 50%; margin: 16px; display: inline-block;"></div>' 
        }
    ];
    
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    execCommand('insertHTML', shape.html);
    updateAIStatus('Forme insérée');
}

function insertHorizontalLine() {
    execCommand('insertHTML', '<hr style="border: none; border-top: 2px solid var(--border-color); margin: 24px 0;">');
    updateAIStatus('Ligne horizontale insérée');
}

function insertDate() {
    const now = new Date();
    const dateString = now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    execCommand('insertHTML', `<span style="color: var(--text-tertiary); font-style: italic;">${dateString}</span>`);
    updateAIStatus('Date insérée');
}

function insertPageBreak() {
    execCommand('insertHTML', `
        <div style="
            page-break-after: always; 
            border-top: 2px dashed var(--border-color); 
            margin: 32px 0; 
            padding: 16px 0; 
            color: var(--text-muted); 
            font-size: 0.875rem; 
            text-align: center;
        ">
            ⸻ Saut de page ⸻
        </div>
    `);
    updateAIStatus('Saut de page inséré');
}

function insertCoverPage() {
    const coverHTML = `
        <div style="
            text-align: center; 
            padding: 120px 60px; 
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%); 
            color: white; 
            border-radius: 12px; 
            margin-bottom: 60px;
        ">
            <h1 style="font-size: 3em; margin-bottom: 24px; font-weight: 700;">TITRE DU DOCUMENT</h1>
            <p style="font-size: 1.5em; margin-bottom: 48px; opacity: 0.9;">Sous-titre ou description du document</p>
            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 32px;">
                <p style="font-size: 1.1em; opacity: 0.8;">Auteur • ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
        </div>
    `;
    execCommand('insertHTML', coverHTML);
    updateAIStatus('Page de garde insérée');
}

// Styles rapides
function applyStyle(styleType) {
    const styles = {
        title: `
            <h1 style="
                color: var(--primary-color); 
                font-size: 2.5em; 
                font-weight: 700; 
                text-align: center; 
                margin-bottom: 24px;
                border-bottom: 3px solid var(--primary-color);
                padding-bottom: 16px;
            ">Titre principal</h1>
        `,
        heading1: `
            <h2 style="
                color: var(--text-primary); 
                font-size: 1.75em; 
                font-weight: 600; 
                margin: 32px 0 16px 0; 
                border-bottom: 2px solid var(--primary-color); 
                padding-bottom: 8px;
            ">Titre de section</h2>
        `,
        heading2: `
            <h3 style="
                color: var(--text-secondary); 
                font-size: 1.25em; 
                font-weight: 600; 
                margin: 24px 0 12px 0;
            ">Sous-titre</h3>
        `,
        quote: `
            <blockquote style="
                border-left: 4px solid var(--accent-color); 
                padding: 16px 24px; 
                background: var(--background-tertiary); 
                border-radius: 0 8px 8px 0; 
                font-style: italic; 
                margin: 20px 0;
                color: var(--text-secondary);
            ">Citation importante...</blockquote>
        `,
        code: `
            <pre style="
                background: var(--text-primary);
                color: white;
                padding: 16px;
                border-radius: 8px;
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 0.9em;
                margin: 16px 0;
                overflow-x: auto;
            "><code>// Votre code ici</code></pre>
        `
    };
    
    execCommand('insertHTML', styles[styleType]);
    updateAIStatus(`Style "${styleType}" appliqué`);
}

// CSS animations supplémentaires
const style = document.createElement('style');
style.textContent = `
    @keyframes dropdownSlideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes statusPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .editor img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: var(--shadow-md);
        margin: 8px 0;
    }
    
    .editor table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
        box-shadow: var(--shadow-sm);
    }
    
    .editor table, .editor th, .editor td {
        border: 1px solid var(--border-color);
    }
    
    .editor th {
        background: var(--background-tertiary);
        font-weight: 600;
        padding: 12px;
    }
    
    .editor td {
        padding: 8px 12px;
    }
    
    .editor blockquote {
        border-left: 4px solid var(--accent-color);
        padding: 16px 24px;
        background: var(--background-tertiary);
        border-radius: 0 8px 8px 0;
        font-style: italic;
        margin: 20px 0;
    }
    
    .editor.focused {
        box-shadow: 0 0 0 2px var(--primary-light);
    }
    
    .nav-dropdown {
        animation: dropdownSlideIn 0.2s ease;
    }
    
    .format-option {
        animation: dropdownSlideIn 0.3s ease;
    }
`;
document.head.appendChild(style);