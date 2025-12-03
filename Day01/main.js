window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const canvasHint = document.getElementById('canvas-hint');
    
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

    // ===== API 키 보기/숨기기 =====
    const apiKeyInput = document.getElementById('api-key');
    const showKeyBtn = document.getElementById('show-key');
    
    showKeyBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            showKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            apiKeyInput.type = 'password';
            showKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });

    // ===== 음악 생성 =====
    const generateBtn = document.getElementById('generate-music');
    const musicResult = document.getElementById('music-result');

    generateBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showResult('error', 'API 키를 입력해주세요.');
            return;
        }

        generateBtn.classList.add('loading');
        generateBtn.disabled = true;

        try {
            const prompt = "An abstract colorful artwork. Generate ambient electronic music that represents this visual art. Make it peaceful and artistic with soft melodies.";
            
            const response = await fetch('https://api.replicate.com/v1/predictions', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    version: '8cf61ea6c56afd61d129e79c9c1c3416b79f0e30a1194a4c99fd3e3b3e95a3ec',
                    input: {
                        prompt_a: prompt,
                        prompt_b: prompt,
                        denoising: 0.75,
                        seed: Math.floor(Math.random() * 1000000)
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API 에러: ${response.status}`);
            }

            const prediction = await response.json();
            let result = prediction;
            let attempts = 0;

            while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 120) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
                    headers: { 'Authorization': `Token ${apiKey}` }
                });

                result = await statusResponse.json();
                attempts++;
            }

            if (result.status === 'succeeded' && result.output) {
                const audioUrl = result.output[0] || result.output;
                showResult('success', `
                    <div class="result-title">
                        <i class="fas fa-check-circle"></i>
                        <span>음악이 생성되었습니다!</span>
                    </div>
                    <audio controls>
                        <source src="${audioUrl}" type="audio/wav">
                    </audio>
                `);
            } else {
                throw new Error('음악 생성에 실패했습니다.');
            }

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
        } else {
            musicResult.innerHTML = content;
        }
    }
});