window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const canvasHint = document.getElementById('canvas-hint');
    
    // 캔버스 분석하여 음악 프롬프트 생성
    function analyzeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let totalR = 0, totalG = 0, totalB = 0;
        let coloredPixels = 0;
        let darkPixels = 0;
        let brightPixels = 0;
        
        // 샘플링 (전체 픽셀 분석은 너무 느림)
        for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 흰색이 아닌 픽셀만 계산
            if (r < 250 || g < 250 || b < 250) {
                totalR += r;
                totalG += g;
                totalB += b;
                coloredPixels++;
                
                const brightness = (r + g + b) / 3;
                if (brightness < 100) darkPixels++;
                if (brightness > 180) brightPixels++;
            }
        }
        
        if (coloredPixels < 10) {
            return "Peaceful ambient electronic music with soft piano melodies";
        }
        
        const avgR = totalR / coloredPixels;
        const avgG = totalG / coloredPixels;
        const avgB = totalB / coloredPixels;
        
        // 색상 기반 분위기 결정
        let mood = [];
        let instruments = [];
        let style = [];
        
        // 빨강 계열 - 열정적, 에너지
        if (avgR > avgG && avgR > avgB) {
            mood.push("energetic", "passionate");
            instruments.push("electric guitar", "drums");
            style.push("rock", "upbeat");
        }
        // 파랑 계열 - 차분함, 평화
        else if (avgB > avgR && avgB > avgG) {
            mood.push("calm", "peaceful", "melancholic");
            instruments.push("piano", "strings");
            style.push("ambient", "classical");
        }
        // 초록 계열 - 자연, 신선
        else if (avgG > avgR && avgG > avgB) {
            mood.push("natural", "fresh", "relaxing");
            instruments.push("acoustic guitar", "flute");
            style.push("folk", "nature sounds");
        }
        // 노랑/주황 계열 - 밝고 희망적
        else if (avgR > 150 && avgG > 120 && avgB < 100) {
            mood.push("happy", "cheerful", "bright");
            instruments.push("ukulele", "bells");
            style.push("pop", "indie");
        }
        // 보라 계열 - 몽환적
        else if (avgR > 100 && avgB > 100 && avgG < 100) {
            mood.push("dreamy", "mysterious", "magical");
            instruments.push("synthesizer", "harp");
            style.push("electronic", "ethereal");
        }
        // 기본
        else {
            mood.push("atmospheric", "gentle");
            instruments.push("piano", "soft synths");
            style.push("ambient", "cinematic");
        }
        
        // 어두운 그림 vs 밝은 그림
        if (darkPixels > brightPixels * 2) {
            mood.push("dark", "intense");
        } else if (brightPixels > darkPixels * 2) {
            mood.push("light", "airy");
        }
        
        const prompt = `${style.join(" ")} music that feels ${mood.join(", ")} with ${instruments.join(" and ")}`;
        return prompt;
    }
    
    // 캔버스 크기를 CSS 크기에 맞춤
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // 현재 그림 저장
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 캔버스 크기 설정
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // 스케일 조정
        ctx.scale(dpr, dpr);
        
        // 흰색 배경
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // 이전 그림 복원 시도
        try {
            ctx.putImageData(imageData, 0, 0);
        } catch(e) {}
    }
    
    resizeCanvas();

    // 상태 변수
    let isDrawing = false;
    let mouseDown = false;
    let lastX = 0;
    let lastY = 0;
    let currentColor = '#FF6B6B';
    let isErasing = false;
    let eraserSize = 20;
    let penWidth = 5;

    // 마우스 좌표 계산 (CSS 크기 기준)
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    // ===== 색상 선택 =====
    const colorBtns = document.querySelectorAll('.color-btn');
    const customColor = document.getElementById('custom-color');
    const penTool = document.getElementById('pen-tool');
    const eraserBtn = document.getElementById('eraser');
    const clearBtn = document.getElementById('clear');
    const penSizeSlider = document.getElementById('pen-size');
    const eraserSizeSlider = document.getElementById('eraser-size');
    const eraserSizeSection = document.getElementById('eraser-size-section');

    // 색상 버튼 클릭
    colorBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            colorBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentColor = this.getAttribute('data-color');
            switchToPen();
        });
    });

    // 커스텀 색상
    customColor.addEventListener('input', function() {
        currentColor = this.value;
        colorBtns.forEach(b => b.classList.remove('active'));
        switchToPen();
    });

    // 펜 도구
    penTool.addEventListener('click', switchToPen);

    function switchToPen() {
        isErasing = false;
        penTool.classList.add('active');
        eraserBtn.classList.remove('active');
        eraserSizeSection.classList.remove('show');
    }

    // 지우개
    eraserBtn.addEventListener('click', () => {
        isErasing = true;
        eraserBtn.classList.add('active');
        penTool.classList.remove('active');
        colorBtns.forEach(b => b.classList.remove('active'));
        eraserSizeSection.classList.add('show');
    });

    // 전체 지우기
    clearBtn.addEventListener('click', () => {
        const rect = canvas.getBoundingClientRect();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, rect.width, rect.height);
        canvasHint.classList.remove('hidden');
    });

    // 펜 크기 슬라이더
    penSizeSlider.addEventListener('input', function() {
        penWidth = parseInt(this.value);
        document.querySelector('.size-value').textContent = penWidth + 'px';
    });

    // 지우개 크기 슬라이더
    eraserSizeSlider.addEventListener('input', function() {
        eraserSize = parseInt(this.value);
        document.querySelector('.eraser-size-value').textContent = eraserSize + 'px';
    });

    // ===== 드로잉 이벤트 =====
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', pauseDrawing);
    canvas.addEventListener('mouseenter', resumeDrawing);
    
    // 마우스가 캔버스 밖에서도 그리기 유지
    document.addEventListener('mousemove', drawOutside);
    document.addEventListener('mouseup', stopDrawingGlobal);

    // 터치 지원
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);

    function startDrawing(e) {
        isDrawing = true;
        mouseDown = true;
        const pos = getMousePos(e);
        lastX = pos.x;
        lastY = pos.y;
        canvasHint.classList.add('hidden');
    }

    function draw(e) {
        if (!isDrawing) return;

        const pos = getMousePos(e);
        const x = pos.x;
        const y = pos.y;

        drawLine(lastX, lastY, x, y);
        lastX = x;
        lastY = y;
    }
    
    function drawOutside(e) {
        if (!mouseDown || !isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 캔버스 영역 내로 좌표 제한
        const clampedX = Math.max(0, Math.min(x, rect.width));
        const clampedY = Math.max(0, Math.min(y, rect.height));
        
        drawLine(lastX, lastY, clampedX, clampedY);
        lastX = clampedX;
        lastY = clampedY;
    }
    
    function drawLine(fromX, fromY, toX, toY) {
        if (isErasing) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(toX, toY, eraserSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(toX - eraserSize / 2, toY - eraserSize / 2, eraserSize, eraserSize);
            ctx.restore();
        } else {
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = penWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();
        }
    }

    function stopDrawing() {
        isDrawing = false;
        mouseDown = false;
    }
    
    function stopDrawingGlobal() {
        mouseDown = false;
        isDrawing = false;
    }
    
    function pauseDrawing() {
        // 마우스가 캔버스를 벗어나도 mouseDown 상태 유지
    }
    
    function resumeDrawing(e) {
        if (mouseDown) {
            isDrawing = true;
            const pos = getMousePos(e);
            lastX = pos.x;
            lastY = pos.y;
        }
    }

    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
        isDrawing = true;
        mouseDown = true;
        canvasHint.classList.add('hidden');
    }

    function handleTouchMove(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        drawLine(lastX, lastY, x, y);
        lastX = x;
        lastY = y;
    }

    // ===== Web Audio API 기반 음악 생성기 =====
    let audioContext = null;
    let isPlaying = false;
    let currentNodes = [];

    // 캔버스 색상 분석하여 음악 파라미터 추출
    function analyzeCanvasForMusic() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let totalR = 0, totalG = 0, totalB = 0;
        let coloredPixels = 0;
        let colors = [];
        
        // 샘플링
        for (let i = 0; i < data.length; i += 160) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            if (r < 250 || g < 250 || b < 250) {
                totalR += r;
                totalG += g;
                totalB += b;
                coloredPixels++;
                colors.push({ r, g, b });
            }
        }
        
        if (coloredPixels < 10) {
            return {
                tempo: 80,
                scale: 'major',
                baseFreq: 261.63,
                mood: 'peaceful',
                colors: []
            };
        }
        
        const avgR = totalR / coloredPixels;
        const avgG = totalG / coloredPixels;
        const avgB = totalB / coloredPixels;
        const brightness = (avgR + avgG + avgB) / 3;
        
        // 색상에 따른 음악 파라미터 결정
        let tempo, scale, baseFreq, mood;
        
        if (avgR > avgG && avgR > avgB) {
            // 빨강 - 빠르고 에너지틱
            tempo = 120 + Math.random() * 20;
            scale = 'minor';
            baseFreq = 329.63; // E4
            mood = 'energetic';
        } else if (avgB > avgR && avgB > avgG) {
            // 파랑 - 차분하고 느림
            tempo = 60 + Math.random() * 20;
            scale = 'major';
            baseFreq = 261.63; // C4
            mood = 'calm';
        } else if (avgG > avgR && avgG > avgB) {
            // 초록 - 자연스럽고 편안
            tempo = 80 + Math.random() * 20;
            scale = 'pentatonic';
            baseFreq = 293.66; // D4
            mood = 'natural';
        } else if (avgR > 150 && avgG > 120 && avgB < 100) {
            // 노랑/주황 - 밝고 경쾌
            tempo = 110 + Math.random() * 20;
            scale = 'major';
            baseFreq = 392.00; // G4
            mood = 'happy';
        } else if (avgR > 100 && avgB > 100 && avgG < 100) {
            // 보라 - 몽환적
            tempo = 70 + Math.random() * 20;
            scale = 'minor';
            baseFreq = 277.18; // C#4
            mood = 'dreamy';
        } else {
            tempo = 85;
            scale = 'major';
            baseFreq = 261.63;
            mood = 'neutral';
        }
        
        // 밝기에 따른 조정
        if (brightness < 80) {
            tempo *= 0.8;
            baseFreq *= 0.8;
        } else if (brightness > 180) {
            tempo *= 1.1;
            baseFreq *= 1.2;
        }
        
        return { tempo, scale, baseFreq, mood, colors: colors.slice(0, 50) };
    }

    // 스케일 정의
    const scales = {
        major: [0, 2, 4, 5, 7, 9, 11, 12],
        minor: [0, 2, 3, 5, 7, 8, 10, 12],
        pentatonic: [0, 2, 4, 7, 9, 12, 14, 16]
    };

    // 주파수 계산
    function getFrequency(baseFreq, semitones) {
        return baseFreq * Math.pow(2, semitones / 12);
    }

    // 음악 생성 및 재생
    function generateAndPlayMusic(params) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // 이전 소리 정지
        stopMusic();
        
        const { tempo, scale, baseFreq, mood, colors } = params;
        const scaleNotes = scales[scale];
        const beatDuration = 60 / tempo;
        const totalDuration = 15; // 15초 재생
        
        // 마스터 게인
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(audioContext.destination);
        currentNodes.push(masterGain);
        
        // 리버브 효과 (간단한 딜레이로 구현)
        const delay = audioContext.createDelay();
        delay.delayTime.value = 0.3;
        const delayGain = audioContext.createGain();
        delayGain.gain.value = 0.2;
        delay.connect(delayGain);
        delayGain.connect(masterGain);
        currentNodes.push(delay, delayGain);
        
        // 베이스 라인
        for (let i = 0; i < totalDuration / (beatDuration * 2); i++) {
            const time = audioContext.currentTime + i * beatDuration * 2;
            const noteIndex = Math.floor(Math.random() * 3);
            const freq = getFrequency(baseFreq / 2, scaleNotes[noteIndex]);
            
            playNote(freq, time, beatDuration * 1.8, 'sine', 0.15, masterGain);
        }
        
        // 멜로디
        let melodyTime = audioContext.currentTime;
        for (let i = 0; i < totalDuration / beatDuration; i++) {
            const noteIndex = Math.floor(Math.random() * scaleNotes.length);
            const freq = getFrequency(baseFreq, scaleNotes[noteIndex]);
            const duration = beatDuration * (Math.random() > 0.7 ? 2 : 1);
            
            if (Math.random() > 0.3) {
                playNote(freq, melodyTime, duration * 0.8, 'triangle', 0.12, masterGain);
                playNote(freq, melodyTime, duration * 0.8, 'triangle', 0.05, delay);
            }
            melodyTime += duration;
        }
        
        // 아르페지오 (색상 기반)
        if (colors.length > 0) {
            for (let i = 0; i < Math.min(colors.length, 30); i++) {
                const color = colors[i];
                const noteIndex = Math.floor((color.r + color.g + color.b) / 100) % scaleNotes.length;
                const freq = getFrequency(baseFreq * 1.5, scaleNotes[noteIndex]);
                const time = audioContext.currentTime + (i * totalDuration / 30);
                
                playNote(freq, time, 0.3, 'sine', 0.06, masterGain);
            }
        }
        
        // 패드 사운드 (배경)
        const padFreqs = [
            getFrequency(baseFreq, 0),
            getFrequency(baseFreq, scaleNotes[2]),
            getFrequency(baseFreq, scaleNotes[4])
        ];
        
        padFreqs.forEach(freq => {
            playPad(freq, audioContext.currentTime, totalDuration, masterGain);
        });
        
        isPlaying = true;
        
        // 자동 정지
        setTimeout(() => {
            stopMusic();
        }, totalDuration * 1000);
        
        return mood;
    }

    // 단일 음 재생
    function playNote(freq, startTime, duration, waveType, volume, destination) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = waveType;
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
        
        currentNodes.push(osc, gain);
    }

    // 패드 사운드
    function playPad(freq, startTime, duration, destination) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 2);
        gain.gain.setValueAtTime(0.08, startTime + duration - 2);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
        
        currentNodes.push(osc, gain, filter);
    }

    // 음악 정지
    function stopMusic() {
        currentNodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch(e) {}
        });
        currentNodes = [];
        isPlaying = false;
    }

    // ===== 음악 생성 버튼 =====
    const generateBtn = document.getElementById('generate-music');
    const musicResult = document.getElementById('music-result');

    generateBtn.addEventListener('click', () => {
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;

        try {
            const params = analyzeCanvasForMusic();
            
            if (params.colors.length < 5) {
                showResult('error', '먼저 캔버스에 그림을 그려주세요! 🎨');
                generateBtn.classList.remove('loading');
                generateBtn.disabled = false;
                return;
            }
            
            const mood = generateAndPlayMusic(params);
            
            const moodText = {
                'energetic': '🔥 에너지 넘치는',
                'calm': '🌊 차분한',
                'natural': '🌿 자연스러운',
                'happy': '☀️ 밝고 경쾌한',
                'dreamy': '🌙 몽환적인',
                'neutral': '🎵 부드러운',
                'peaceful': '✨ 평화로운'
            };
            
            showResult('success', `
                <div class="result-title">
                    <i class="fas fa-music"></i>
                    <span>${moodText[mood] || moodText.neutral} 음악이 생성되었습니다!</span>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
                    <button id="stop-music" style="padding: 10px 20px; background: linear-gradient(135deg, #FF6B6B, #FF8E8E); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-stop"></i> 정지
                    </button>
                    <button id="replay-music" style="padding: 10px 20px; background: linear-gradient(135deg, #4ECDC4, #44A08D); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-redo"></i> 다시 재생
                    </button>
                </div>
                <div style="margin-top: 15px; font-size: 12px; color: #94A3B8;">
                    템포: ${Math.round(params.tempo)} BPM | 스케일: ${params.scale} | 분위기: ${mood}
                </div>
            `);
            
            // 정지/재생 버튼 이벤트
            setTimeout(() => {
                const stopBtn = document.getElementById('stop-music');
                const replayBtn = document.getElementById('replay-music');
                
                if (stopBtn) {
                    stopBtn.addEventListener('click', () => {
                        stopMusic();
                        stopBtn.innerHTML = '<i class="fas fa-check"></i> 정지됨';
                    });
                }
                
                if (replayBtn) {
                    replayBtn.addEventListener('click', () => {
                        generateAndPlayMusic(params);
                    });
                }
            }, 100);

        } catch (error) {
            console.error('Error:', error);
            showResult('error', `오류: ${error.message}`);
        } finally {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
        }
    });

    function showResult(type, content) {
        musicResult.classList.add('show');
        if (type === 'error') {
            musicResult.innerHTML = `<div style="color: #FF6B6B;"><i class="fas fa-exclamation-circle"></i> ${content}</div>`;
        } else if (type === 'info') {
            musicResult.innerHTML = `<div style="color: #60A5FA;">${content}</div>`;
        } else {
            musicResult.innerHTML = content;
        }
    }
});