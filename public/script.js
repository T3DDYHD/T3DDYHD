const volumeIcon = document.getElementById('volume-icon');
const iconElement = volumeIcon.querySelector('i');

let isMuted = false;
let lastVolume = 1;

volumeIcon.addEventListener('click', () => {
    if (isMuted) {
        iconElement.className = 'fas fa-volume-up';
        document.getElementById('background').muted = false;
    } else {
        iconElement.className = 'fas fa-volume-mute';
        document.getElementById('background').muted = true;
    }
    isMuted = !isMuted;
});

function updateSong(playlist) {
    if (playlist.length > 0) {
        // Vælg en tilfældig sang
        const randomIndex = Math.floor(Math.random() * playlist.length);
        const currentSong = playlist[randomIndex];

        // Sæt sangdetaljerne
        document.getElementById('song-name').textContent = currentSong.songTitle;
        document.getElementById('artist-name').textContent = currentSong.artistName;
        document.getElementById('album-image').src = currentSong.albumCover;

        // Vis sektionen 'currently playing'
        document.getElementById('currently-playing').style.display = 'flex';

        // Sæt video-kilden
        const backgroundVideo = document.getElementById('background');
        document.getElementById('background').src = currentSong.videoSource;

        // Skift til en ny tilfældig sang, når den nuværende slutter
        backgroundVideo.onended = () => {
            updateSong(playlist); // Opdater sanginfo og afspil næste tilfældige sang
        };

        // Afspil den nye video
        backgroundVideo.load(); // Load den nye video
        backgroundVideo.play().catch(error => {
            console.error('Fejl ved afspilning af video:', error);
        });
    }
}


window.addEventListener("load", function () {
    document.getElementById('profile-container').style.display = 'none';
});

// Call this function after loading the config to start the first song
async function loadConfig() {
    const response = await fetch('config.json');
    const config = await response.json();

    // Set background video, header, and profile picture
    document.getElementById('background').src = config.backgroundVideo;
    document.getElementById('profile-header').style.backgroundImage = `url('${config.headerImage}')`;
    document.getElementById('profile-pic').src = config.logo;
    document.getElementById('username').textContent = config.username;

    // Update social links
    const socialIconsContainer = document.getElementById('social-icons');
    config.socialLinks.forEach(link => {
        const iconElement = document.createElement('a');
        iconElement.href = link.url;
        iconElement.target = '_blank';
        iconElement.innerHTML = `<i class="${link.icon}" style="color: ${link.color}; text-shadow: ${link.textshadow};"></i>`;

        socialIconsContainer.appendChild(iconElement);
    });

    // Handle the song playlist
    updateSong(config.currentlyPlaying); // Start playing the first song

    // Update viewer count and other config-related data
    updateViewerCount();
    updateDiscordStatus(config.discordId);
}

async function updateViewerCount() {
    try {
        const ip = await getIP();

        // Send IP'en til serveren for at opdatere database
        await fetch('/update-viewer-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip }),
        });

        // Hent den opdaterede viewer count
        const response = await fetch('/get-viewer-count');
        const data = await response.json();
        animateViewerCount(0, data.viewCount);
    } catch (error) {
        console.error('Failed to update viewer count:', error);
    }
}

function animateViewerCount(oldCount, newCount) {
    const viewerCountElement = document.getElementById('viewer-count');
    let currentCount = oldCount;
    const duration = 2500; // Totaltid for animationen (ms)
    const startTime = performance.now(); // Starttidspunkt for animationen

    function updateCounter(timestamp) {
        let elapsed = timestamp - startTime;
        let progress = Math.min(elapsed / duration, 1); // Holder progress mellem 0 og 1
        currentCount = oldCount + (newCount - oldCount) * progress;

        viewerCountElement.innerHTML = `${Math.round(currentCount)} <i class='fas fa-eye'></i>`;

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

async function getIP() {
    const response = await fetch('https://api64.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
}

// Kald updateViewerCount, når siden indlæses
document.addEventListener('DOMContentLoaded', () => {
    updateViewerCount();

    // Opdater viewer count periodisk, f.eks. hver 30. sekund
    setInterval(updateViewerCount, 30000);
});

async function updateDiscordStatus(discordId) {
    try {
        const response = await fetch(`/get-discord-profile`);
        if (!response.ok) throw new Error('Failed to fetch Discord status');

        const data = await response.json();
        const status = data.discord_status;
        const lastSeenOffline = data.lastSeenOffline;

        const statusIndicator = document.getElementById('status-indicator');
        const lastSeenElement = document.getElementById('last-seen'); // New element for "Last seen"
        statusIndicator.className = 'status-indicator';
        statusIndicator.innerHTML = ''; // Clear previous icon

        switch (status) {
            case 'online':
                statusIndicator.classList.add('status-online');
                lastSeenElement.textContent = ''; // Clear "Last seen" when online
                break;
            case 'idle':
                statusIndicator.classList.add('status-idle');
                statusIndicator.innerHTML = '<i class="fa-solid fa-moon" font-size: 24px; color: #F0B232; left: -10px;"></i>';
                break;
            case 'dnd':
                statusIndicator.classList.add('status-dnd');
                statusIndicator.innerHTML = '<i class="fa-solid fa-circle-minus" font-size: 20px; color: #ed4245;"></i>';
                break;
            default:
                statusIndicator.classList.add('status-offline');
                break;
        }

        if (lastSeenOffline) {
            const lastSeenDate = new Date(lastSeenOffline);
            const now = new Date();
            const diffInMinutes = Math.floor((now - lastSeenDate) / 60000);

            let timeString = '';

            if (diffInMinutes < 1) {
                timeString = 'Now';
            } else if (diffInMinutes < 60) {
                timeString = `${diffInMinutes} minut${diffInMinutes === 1 ? '' : 'ter'} siden`;
            } else {
                const diffInHours = Math.floor(diffInMinutes / 60);
                if (diffInHours < 24) {
                    timeString = `${diffInHours} time${diffInHours === 1 ? '' : 'r'} siden`;
                } else {
                    const diffInDays = Math.floor(diffInHours / 24);
                    if (diffInDays < 7) {
                        timeString = `${diffInDays} dag${diffInDays === 1 ? '' : 'e'} siden`;
                    } else {
                        const diffInWeeks = Math.floor(diffInDays / 7);
                        if (diffInWeeks < 4) {
                            timeString = `${diffInWeeks} uge${diffInWeeks === 1 ? '' : 'r'} siden`;
                        } else {
                            const diffInMonths = Math.floor(diffInDays / 30);
                            if (diffInMonths < 12) {
                                timeString = `${diffInMonths} måned${diffInMonths === 1 ? '' : 'er'} siden`;
                            } else {
                                const diffInYears = Math.floor(diffInMonths / 12);
                                timeString = `${diffInYears} år ${diffInYears === 1 ? '' : ''} siden`;
                            }
                        }
                    }
                }
            }

            lastSeenElement.textContent = `Sidst set: ${timeString}`;
        } else {
            lastSeenElement.textContent = ''; // Clear when online
        }
    } catch (error) {
        console.error('Error updating Discord status:', error);
    }
}

function startStatusUpdates(discordId) {
    const volumeContainer = document.querySelector('.volume-container');

    if (volumeContainer) {
        volumeContainer.style.display = 'flex'; // Skift til flex for at vise elementet
    }
    // Start the status updates when overlay is clicked
    const overlay = document.getElementById('overlay');
    const privacyFooter = document.getElementById('privacy-footer');
    
    overlay.addEventListener('click', () => {
        overlay.classList.add('hidden');
        privacyFooter.classList.add('hidden'); // Skjul footeren
        document.getElementById('profile-container').style.display = 'flex';
        document.getElementById('volume-icon').style.display = 'flex';
        loadConfig();
        setInterval(fetchSpotifyData, 500); // Fetch Spotify data every 5 seconds
    
        document.getElementById('background').muted = false;
        document.getElementById('background').play().catch(error => {
            console.error('Error playing video after click:', error);
        });
    
        document.getElementById('background').pause();
        document.getElementById('background').currentTime = 0;
        document.getElementById('background').play();
        document.getElementById('background').volume = 0.15;

        overlay.removeEventListener('click', arguments.callee);
    });

    // Fetch the status periodically
    setInterval(() => {
        updateDiscordStatus(discordId);
    }, 1000); // Update every 1 seconds
}

startStatusUpdates('513639579715371009'); // Pass Discord ID here

let titleText = "@T3DDYUHD";
let currentText = "@";
let forward = true;
let i = 1;
const usernameElement = document.querySelector(".username");

function animateTitle() {
    if (forward) {
        currentText += titleText[i];
        i++;
        if (i === titleText.length) {
            forward = false;
        }
    } else {
        currentText = currentText.slice(0, -1); // Fjerner sidste tegn
        i--;
        if (i === 1) {
            forward = true;
        }
    }
    
    document.title = currentText;
    if (usernameElement) usernameElement.textContent = currentText; // Undgår fejl hvis element ikke findes
}

// Brug `requestAnimationFrame` for bedre performance
function loop() {
    animateTitle();
    setTimeout(loop, 1000); // Justér hastigheden efter behov
}

loop();

document.addEventListener("DOMContentLoaded", async function () {
    const adBox = document.querySelector(".advertisement-box");
    const textElement = document.querySelector(".ad-description");
    const titleElement = document.querySelector(".ad-title");

    let adData;
    
    try {
        const response = await fetch('/get-ad');
        adData = await response.json();
    } catch (error) {
        console.error("Fejl ved hentning af annonce:", error);
        return; // Stop funktionen, hvis der er en fejl
    }

    const titleText = adData.title || "Annonce";
    const fullText = adData.description || "Beskrivelse ikke tilgængelig";

    titleElement.textContent = titleText;
    let index = 0;
    let showCursor = true;
    let typingStarted = false; 
    let adActivated = false; // Forhindrer gentagne aktiveringer

    // Skjul annonceboksen fra start
    adBox.style.display = "none";

    function typeWriter() {
        if (index < fullText.length) {
            textElement.textContent = fullText.slice(0, index + 1) + (showCursor ? "|" : " ");
            index++;

            let speed = Math.random() * (180 - 120) + 120; 
            setTimeout(typeWriter, speed);
        } else {
            startBlinking();
        }
    }

    function startBlinking() {
        setInterval(() => {
            showCursor = !showCursor;
            textElement.textContent = fullText + (showCursor ? " |" : " ");
        }, 500);
    }

    document.addEventListener("click", function () {
        if (!adActivated) { 
            adActivated = true; // Sikrer, at det kun kan aktiveres én gang
            adBox.style.display = "flex";
            if (!typingStarted) {
                typingStarted = true;
                typeWriter(); 
            }
        }
    });
});

async function checkScriptIntegrity() {
    try {
        const response = await fetch('/check-integrity');
        const data = await response.json();
        
        if (!data.valid) {
            document.body.innerHTML = "<h1>Fejl: Uautoriseret ændring registreret!</h1>";
            setInterval(() => {
                document.body.style.display = "none";
            }, 100);
        }
    } catch (error) {
        console.error("Fejl ved kontrol af filintegritet:", error);
    }
}

// Tjek integriteten hvert 5. sekund
setInterval(checkScriptIntegrity, 500);

(function protectScript() {
    const originalScript = document.currentScript.innerHTML;

    setInterval(() => {
        if (document.currentScript.innerHTML !== originalScript) {
            document.body.innerHTML = "<h1>Systemfejl: Manipulation opdaget!</h1>";
            setInterval(() => {
                document.body.style.display = "none";
            }, 100);
        }
    }, 3000);
})();

document.addEventListener('DOMContentLoaded', () => {
});


async function fetchSpotifyData() {
    try {
        const response = await fetch('/get-spotify-status');
        const data = await response.json();

        console.log("Spotify Data:", data);  // Debugging: se hvad der kommer fra serveren

        const spotifyContainer = document.getElementById('spotify-container');
        const albumElement = document.getElementById('spotify-album');
        const titleElement = document.getElementById('spotify-title');
        const artistElement = document.getElementById('spotify-artist');
        const progressBar = document.getElementById('progress-bar');
        const currentTimeElement = document.getElementById('current-time');
        const durationElement = document.getElementById('duration');

        // Formatfunktion for tid (mm:ss)
        const formatTime = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        };

        // Hvis musikken afspilles
        if (data.is_playing) {
            if (spotifyContainer && albumElement && titleElement && artistElement) {
                albumElement.src = data.album_cover;
                titleElement.textContent = data.song_name;
                artistElement.textContent = data.artist_name;
                spotifyContainer.style.display = 'flex';

                // Hent elapsed_time og duration fra data
                const elapsedTime = data.elapsed_time || 0;
                const duration = data.duration || 1; // For at undgå division med nul

                console.log("Elapsed Time:", elapsedTime);  // Debugging: se hvilken tid der er gået
                console.log("Duration:", duration);  // Debugging: se hvilken varighed sangen har

                // Formatér og vis den aktuelle tid og varighed
                currentTimeElement.textContent = formatTime(elapsedTime);  // Opdaterer visningen af current-time
                durationElement.textContent = formatTime(duration);        // Opdaterer visningen af duration

                // Start opdatering af progressbaren
                let progress = (elapsedTime / duration) * 100;
                progressBar.style.width = progress + '%';

                // Opdater progressbaren og tiden hvert sekund
                const interval = setInterval(() => {
                    if (progress < 100) {
                        progress += (100 / duration); // Øg progressen hver sekund
                        progressBar.style.width = Math.min(progress, 100) + '%'; // Sørg for, at den ikke går over 100

                        // Opdater den aktuelle tid
                        currentTimeElement.textContent = formatTime(elapsedTime);

                    } else {
                        clearInterval(interval); // Stop når progressen når 100
                    }
                }, 1000); // Opdatering hvert sekund
            }
        } else {
            if (spotifyContainer) {
                spotifyContainer.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error fetching Spotify data:', error);
    }
}
