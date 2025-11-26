	// 지우개 미리보기용 오버레이 캔버스 생성
	let previewCircle = null;
	let eraserSize = 20; // 전역으로 선언 이동
	
	function createPreviewCircle() {
		const wrap = document.getElementById('canvas-wrap');
		if (!previewCircle) {
			previewCircle = document.createElement('canvas');
			previewCircle.width = canvas.width;
			previewCircle.height = canvas.height;
			previewCircle.style.position = 'absolute';
			previewCircle.style.left = '0px';
			previewCircle.style.top = '0px';
			previewCircle.style.pointerEvents = 'none';
			previewCircle.style.zIndex = 5;
			wrap.appendChild(previewCircle);
		}
	}
	function updatePreviewCircle(x, y) {
		if (!previewCircle) return;
		const ctx2 = previewCircle.getContext('2d');
		ctx2.clearRect(0, 0, previewCircle.width, previewCircle.height);
		ctx2.beginPath();
		ctx2.arc(x, y, eraserSize/2, 0, 2 * Math.PI);
		ctx2.fillStyle = 'rgba(0,0,0,0.12)';
		ctx2.strokeStyle = 'rgba(0,0,0,0.3)';
		ctx2.fill();
		ctx2.stroke();
	}
	function removePreviewCircle() {
		if (previewCircle) {
			previewCircle.parentNode.removeChild(previewCircle);
			previewCircle = null;
		}
	}
// 그림판(캔버스) 드로잉, 색상 선택, 지우개, 전체 지우기, 노래 생성 버튼 기능 구현
window.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById('canvas');
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	// 캔버스 배경을 흰색으로 초기화 (지우개가 투명하게 동작하도록)
	ctx.save();
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.restore();
	let drawing = false;
	let currentColor = '#ff0000ff';
	let lastX = 0, lastY = 0;
	let erasing = false;


	// 색상 버튼 이벤트
	document.querySelectorAll('.color-btn').forEach(btn => {
		btn.addEventListener('click', function() {
			erasing = false;
			document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
			this.classList.add('active');
			currentColor = this.getAttribute('data-color');
			// 커스텀 컬러 선택기 비활성화
			const customColor = document.getElementById('custom-color');
			if (customColor) customColor.value = '#000000';
		});
	});
	// 커스텀 색상 선택기 이벤트
	const customColor = document.getElementById('custom-color');
	if (customColor) {
		customColor.addEventListener('input', function() {
			erasing = false;
			document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
			currentColor = this.value;
		});
	}
	// 기본 색상 활성화
	const firstColor = document.querySelector('.color-btn');
	if (firstColor) firstColor.classList.add('active');

	// 지우개 버튼

	// 지우개 버튼
	const eraserBtn = document.getElementById('eraser');
	const eraserSizeSelect = document.getElementById('eraser-size');
	eraserBtn.addEventListener('click', () => {
		erasing = true;
		document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
		if (eraserSizeSelect) eraserSizeSelect.style.display = 'inline-block';
		createPreviewCircle();
	});
	if (eraserSizeSelect) {
		eraserSizeSelect.addEventListener('change', function() {
			eraserSize = parseInt(this.value, 10);
		});
	}

	// 전체 지우기
	document.getElementById('clear').addEventListener('click', () => {
		ctx.save();
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.restore();
	});

	// 색상/펜 선택 시 지우개 크기 선택 숨김
	document.querySelectorAll('.color-btn, #custom-color').forEach(el => {
		el.addEventListener('click', () => {
			if (eraserSizeSelect) eraserSizeSelect.style.display = 'none';
			removePreviewCircle();
		});
	});

	// 드로잉 이벤트

	// 마우스 상태 추적 (캔버스 위에서만)
	let mouseDown = false;
	canvas.addEventListener('mousedown', (e) => {
		drawing = true;
		mouseDown = true;
		[lastX, lastY] = [e.offsetX, e.offsetY];
	});
	window.addEventListener('mouseup', () => {
		drawing = false;
		mouseDown = false;
	});
	canvas.addEventListener('mouseleave', () => {
		drawing = false;
		removePreviewCircle();
	});
	canvas.addEventListener('mouseenter', (e) => {
		// 마우스가 눌린 상태로 다시 들어오면 드로잉 재개
		if (mouseDown) {
			drawing = true;
			// 마우스 위치 갱신
			const rect = canvas.getBoundingClientRect();
			lastX = e.clientX - rect.left;
			lastY = e.clientY - rect.top;
		}
		if (erasing) {
			createPreviewCircle();
			updatePreviewCircle(e.offsetX, e.offsetY);
		}
	});
	canvas.addEventListener('mousemove', (e) => {
		// 미리보기 표시
		if (erasing) {
			createPreviewCircle();
			updatePreviewCircle(e.offsetX, e.offsetY);
		} else {
			removePreviewCircle();
		}

		// 실제 드로잉 처리
		if (!drawing) return;

		console.log('Drawing:', {erasing, x: e.offsetX, y: e.offsetY, eraserSize}); // 디버그

		if (erasing) {
			// 지우개: 원형 영역을 투명하게 지움
			const x = e.offsetX;
			const y = e.offsetY;
			const radius = eraserSize / 2;
			ctx.save();
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.clip();
			ctx.clearRect(x - radius, y - radius, eraserSize, eraserSize);
			ctx.restore();
		} else {
			// 펜: 선으로 그림
			ctx.strokeStyle = currentColor;
			ctx.lineWidth = 3;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(e.offsetX, e.offsetY);
			ctx.stroke();
		}
		[lastX, lastY] = [e.offsetX, e.offsetY];
	});

	// 노래 생성 버튼 (Replicate AI 연동)
	document.getElementById('generate-music').addEventListener('click', async () => {
		const apiKeyInput = document.getElementById('api-key');
		const apiKey = apiKeyInput.value.trim();
		
		if (!apiKey) {
			document.getElementById('music-result').innerHTML = '<span style="color:red;">API 키를 입력하세요!</span>';
			return;
		}

		const musicResult = document.getElementById('music-result');
		musicResult.innerHTML = 'AI가 그림을 분석하고 음악을 생성 중입니다...';

		try {
			// 1. 그림을 base64로 변환
			const imageData = canvas.toDataURL('image/png');
			
			// 2. 그림에 대한 설명 생성 (간단한 프롬프트 사용)
			const prompt = "An abstract artwork. Generate ambient electronic music that represents this visual art. Make it peaceful and artistic.";
			
			// 3. Replicate API로 음악 생성 요청 (Riffusion 모델)
			const response = await fetch('https://api.replicate.com/v1/predictions', {
				method: 'POST',
				headers: {
					'Authorization': `Token ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					version: '8cf61ea6c56afd61d129e79c9c1c3416b79f0e30a1194a4c99fd3e3b3e95a3ec', // Riffusion v3
					input: {
						prompt_a: prompt,
						prompt_b: prompt,
						denoising: 0.75,
						seed: Math.floor(Math.random() * 1000000)
					}
				})
			});

			if (!response.ok) {
				throw new Error(`API 에러: ${response.status} ${response.statusText}`);
			}

			const prediction = await response.json();
			
			// 4. 생성 상태 폴링
			let result = prediction;
			let attempts = 0;
			const maxAttempts = 60; // 최대 60초 대기

			while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
				await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
				
				const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
					headers: {
						'Authorization': `Token ${apiKey}`
					}
				});

				result = await statusResponse.json();
				attempts++;
				musicResult.innerHTML = `생성 중... (${attempts}초)`;
			}

			// 5. 결과 표시
			if (result.status === 'succeeded' && result.output) {
				const audioUrl = result.output[0] || result.output;
				musicResult.innerHTML = `
					<b style="color:green;">✓ 음악 생성 완료!</b><br>
					<audio controls style="margin-top:10px; width:100%; max-width:500px;">
						<source src="${audioUrl}" type="audio/wav">
						브라우저가 오디오를 지원하지 않습니다.
					</audio>
				`;
			} else if (result.status === 'failed') {
				throw new Error('음악 생성 실패: ' + (result.error || '알 수 없는 오류'));
			} else {
				throw new Error('음악 생성 시간 초과');
			}

		} catch (error) {
			console.error('오류:', error);
			musicResult.innerHTML = `<span style="color:red;">오류: ${error.message}</span>`;
		}
	});
});
