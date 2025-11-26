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

	// 노래 생성 버튼
	document.getElementById('generate-music').addEventListener('click', async () => {
		// 그림 데이터를 base64로 추출
		const imageData = canvas.toDataURL('image/png');
		// 실제 AI 연동 부분 (예시)
		document.getElementById('music-result').innerHTML = 'AI가 그림을 분석하여 노래를 생성 중입니다... (데모)';
		// 실제로는 서버에 imageData를 전송하고, 음악 생성 결과를 받아야 함
		// 아래는 데모용 (실제 AI 연동 필요)
		setTimeout(() => {
			document.getElementById('music-result').innerHTML = '<b>노래 생성 완료!</b><br><audio controls src="demo-music.mp3"></audio><br>(실제 AI 연동 필요)';
		}, 2000);
	});
});
