window.addEventListener('DOMContentLoaded', () => {
	// API 키 자동 설정
	document.getElementById('api-key').value = 'YOUR_API_KEY_HERE';
	
	const canvas = document.getElementById('canvas');
	const ctx = canvas.getContext('2d', { alpha: true });
	
	// 미리보기 캔버스 생성
	const previewCanvas = document.createElement('canvas');
	previewCanvas.width = canvas.width;
	previewCanvas.height = canvas.height;
	previewCanvas.style.position = 'absolute';
	previewCanvas.style.left = '0px';
	previewCanvas.style.top = '0px';
	previewCanvas.style.pointerEvents = 'none';
	previewCanvas.style.zIndex = 5;
	document.getElementById('canvas-wrap').appendChild(previewCanvas);
	const previewCtx = previewCanvas.getContext('2d');
	
	// 캔버스 초기화 (투명한 배경)
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// 흰색 배경 추가
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	let isDrawing = false;
	let lastX = 0;
	let lastY = 0;
	let currentColor = '#ff0000';
	let isErasing = false;
	let eraserSize = 20;
	let penWidth = 3;

	// ===== 색상 선택 =====
	const colorBtns = document.querySelectorAll('.color-btn');
	colorBtns.forEach((btn, index) => {
		if (index === 0) btn.classList.add('active');
		btn.addEventListener('click', function() {
			colorBtns.forEach(b => b.classList.remove('active'));
			this.classList.add('active');
			currentColor = this.getAttribute('data-color');
			isErasing = false;
			document.getElementById('eraser-size').style.display = 'none';
		});
	});

	// ===== 커스텀 색상 =====
	const customColor = document.getElementById('custom-color');
	customColor.addEventListener('input', function() {
		currentColor = this.value;
		isErasing = false;
		colorBtns.forEach(b => b.classList.remove('active'));
		document.getElementById('eraser-size').style.display = 'none';
	});

	// ===== 펜 굵기 =====
	const penSizeSelect = document.getElementById('pen-size');
	penSizeSelect.addEventListener('change', (e) => {
		penWidth = parseInt(e.target.value);
	});

	// ===== 지우개 =====
	const eraserBtn = document.getElementById('eraser');
	const eraserSizeSelect = document.getElementById('eraser-size');
	
	eraserBtn.addEventListener('click', () => {
		isErasing = true;
		colorBtns.forEach(b => b.classList.remove('active'));
		eraserSizeSelect.style.display = 'inline-block';
	});

	eraserSizeSelect.addEventListener('change', (e) => {
		eraserSize = parseInt(e.target.value);
	});

	// ===== 전체 지우기 =====
	document.getElementById('clear').addEventListener('click', () => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	});

	// ===== 마우스 드로잉 이벤트 =====
	let mouseDown = false;
	
	canvas.addEventListener('mousedown', (e) => {
		isDrawing = true;
		mouseDown = true;
		lastX = e.offsetX;
		lastY = e.offsetY;
	});

	document.addEventListener('mouseup', () => {
		isDrawing = false;
		mouseDown = false;
		previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
	});

	canvas.addEventListener('mouseleave', () => {
		isDrawing = false;
		previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
	});

	canvas.addEventListener('mouseenter', (e) => {
		// 마우스가 눌린 상태로 다시 들어오면 드로잉 재개
		if (mouseDown) {
			isDrawing = true;
			lastX = e.offsetX;
			lastY = e.offsetY;
		}
	});

	canvas.addEventListener('mousemove', (e) => {
		const x = e.offsetX;
		const y = e.offsetY;

		// 미리보기 업데이트 (캔버스 위에 있을 때만)
		if (e.target === canvas) {
			previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
			if (isErasing) {
				previewCtx.beginPath();
				previewCtx.arc(x, y, eraserSize / 2, 0, Math.PI * 2);
				previewCtx.fillStyle = 'rgba(200, 200, 200, 0.3)';
				previewCtx.fill();
				previewCtx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
				previewCtx.lineWidth = 1;
				previewCtx.stroke();
			}
		} else {
			previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
		}

		if (!isDrawing) return;

		if (isErasing) {
			// 지우기: 원형 영역을 완전히 투명하게
			ctx.save();
			ctx.beginPath();
			ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2);
			ctx.clip();
			ctx.clearRect(x - eraserSize / 2, y - eraserSize / 2, eraserSize, eraserSize);
			ctx.restore();
		} else {
			// 그리기
			ctx.strokeStyle = currentColor;
			ctx.lineWidth = penWidth;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(x, y);
			ctx.stroke();
		}

		lastX = x;
		lastY = y;
	});

	// ===== 노래 생성 (Replicate AI) =====
	document.getElementById('generate-music').addEventListener('click', async () => {
		const apiKeyInput = document.getElementById('api-key');
		const apiKey = apiKeyInput.value.trim();
		
		if (!apiKey) {
			document.getElementById('music-result').innerHTML = '<span style="color:red;">API 키를 입력하세요!</span>';
			return;
		}

		const musicResult = document.getElementById('music-result');
		musicResult.innerHTML = 'AI가 음악을 생성 중입니다...';

		try {
			const prompt = "An abstract artwork. Generate ambient electronic music that represents this visual art. Make it peaceful and artistic.";
			
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

			while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 60) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
					headers: {
						'Authorization': `Token ${apiKey}`
					}
				});

				result = await statusResponse.json();
				attempts++;
				musicResult.innerHTML = `생성 중... (${attempts}초)`;
			}

			if (result.status === 'succeeded' && result.output) {
				const audioUrl = result.output[0] || result.output;
				musicResult.innerHTML = `
					<b style="color:green;">✓ 음악 생성 완료!</b><br>
					<audio controls style="margin-top:10px; width:100%; max-width:500px;">
						<source src="${audioUrl}" type="audio/wav">
					</audio>
				`;
			} else {
				throw new Error('음악 생성 실패');
			}

		} catch (error) {
			console.error('오류:', error);
			musicResult.innerHTML = `<span style="color:red;">오류: ${error.message}</span>`;
		}
	});
});
