/**
 * Art2Music - Canvas Drawing to Music Generation Application
 * 
 * @fileoverview 이 애플리케이션은 사용자의 그림을 분석하여 음악을 생성합니다.
 * HTML5 Canvas API, Web Audio API, Spotify Web API를 활용합니다.
 * 
 * @author Art2Music Team
 * @version 2.0.0
 * @license MIT
 */

'use strict';

/**
 * 애플리케이션 설정 상수
 * @constant {Object}
 */
const CONFIG = Object.freeze({
    CANVAS: {
        SAMPLE_INTERVAL: 160,
        MIN_COLORED_PIXELS: 10,
        WHITE_THRESHOLD: 250
    },
    AUDIO: {
        DEFAULT_DURATION: 15,
        MASTER_VOLUME: 0.3,
        DELAY_TIME: 0.3,
        DELAY_FEEDBACK: 0.2
    },
    COLORS: {
        RED_DOMINANT: 'red',
        BLUE_DOMINANT: 'blue',
        GREEN_DOMINANT: 'green',
        YELLOW_ORANGE: 'yellow',
        PURPLE: 'purple'
    }
});

/**
 * 음계 데이터 정의
 * @constant {Object}
 */
const MUSICAL_SCALES = Object.freeze({
    major: [0, 2, 4, 5, 7, 9, 11, 12],
    minor: [0, 2, 3, 5, 7, 8, 10, 12],
    pentatonic: [0, 2, 4, 7, 9, 12, 14, 16],
    blues: [0, 3, 5, 6, 7, 10, 12],
    dorian: [0, 2, 3, 5, 7, 9, 10, 12],
    mixolydian: [0, 2, 4, 5, 7, 9, 10, 12]
});

/**
 * 코드 진행 패턴
 * @constant {Object}
 */
const CHORD_PROGRESSIONS = Object.freeze({
    pop: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],           // I-IV-V-I
    sad: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [0, 3, 7]],            // i-iv-III-i
    happy: [[0, 4, 7], [4, 7, 11], [5, 9, 12], [7, 11, 14]],        // I-iii-IV-V
    dreamy: [[0, 4, 7, 11], [2, 5, 9, 12], [4, 7, 11, 14], [0, 4, 7, 11]], // Maj7 진행
    energetic: [[0, 4, 7], [7, 11, 14], [5, 9, 12], [0, 4, 7]],     // I-V-IV-I
    calm: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [0, 4, 7]]           // I-vi-IV-I
});

/**
 * 멜로디 패턴 (음정 변화)
 * @constant {Object}
 */
const MELODY_PATTERNS = Object.freeze({
    ascending: [0, 1, 2, 3, 4, 5, 4, 3],
    descending: [5, 4, 3, 2, 1, 0, 1, 2],
    wave: [0, 2, 4, 2, 0, -2, 0, 2],
    jump: [0, 4, 2, 5, 3, 6, 4, 7],
    gentle: [0, 1, 0, 2, 1, 0, 1, 2],
    dramatic: [0, 4, 7, 4, 0, -3, 0, 4]
});

/**
 * 리듬 패턴 (박자 배율)
 * @constant {Object}
 */
const RHYTHM_PATTERNS = Object.freeze({
    steady: [1, 1, 1, 1, 1, 1, 1, 1],
    syncopated: [1.5, 0.5, 1, 1, 1.5, 0.5, 1, 1],
    waltz: [1.5, 0.75, 0.75, 1.5, 0.75, 0.75],
    flowing: [2, 1, 1, 2, 1, 1, 1, 1],
    energetic: [0.5, 0.5, 1, 0.5, 0.5, 1, 1, 1],
    calm: [2, 2, 1, 1, 2, 2]
});

/**
 * 분위기별 텍스트 매핑
 * @constant {Object}
 */
const MOOD_DESCRIPTIONS = Object.freeze({
    energetic: '🔥 에너지 넘치는',
    calm: '🌊 차분한',
    natural: '🌿 자연스러운',
    happy: '☀️ 밝고 경쾌한',
    dreamy: '🌙 몽환적인',
    neutral: '🎵 부드러운',
    peaceful: '✨ 평화로운'
});

// ============================================================================
// 유틸리티 클래스
// ============================================================================

/**
 * 색상 분석 유틸리티 클래스
 * @class ColorAnalyzer
 */
class ColorAnalyzer {
    /**
     * 이미지 데이터에서 색상 통계를 추출합니다.
     * @param {ImageData} imageData - 캔버스 이미지 데이터
     * @returns {Object} 색상 분석 결과
     */
    static analyze(imageData) {
        const data = imageData.data;
        const result = {
            totalR: 0,
            totalG: 0,
            totalB: 0,
            coloredPixels: 0,
            colors: []
        };

        for (let i = 0; i < data.length; i += CONFIG.CANVAS.SAMPLE_INTERVAL) {
            const pixel = this._extractPixel(data, i);
            
            if (this._isColoredPixel(pixel)) {
                result.totalR += pixel.r;
                result.totalG += pixel.g;
                result.totalB += pixel.b;
                result.coloredPixels++;
                result.colors.push(pixel);
            }
        }

        return this._calculateAverages(result);
    }

    /**
     * 픽셀 데이터를 RGB 객체로 추출합니다.
     * @private
     * @param {Uint8ClampedArray} data - 이미지 데이터 배열
     * @param {number} index - 시작 인덱스
     * @returns {Object} RGB 값 객체
     */
    static _extractPixel(data, index) {
        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2]
        };
    }

    /**
     * 픽셀이 흰색이 아닌지 확인합니다.
     * @private
     * @param {Object} pixel - RGB 픽셀 객체
     * @returns {boolean} 색상이 있는 픽셀인지 여부
     */
    static _isColoredPixel(pixel) {
        const threshold = CONFIG.CANVAS.WHITE_THRESHOLD;
        return pixel.r < threshold || pixel.g < threshold || pixel.b < threshold;
    }

    /**
     * 색상 평균값을 계산합니다.
     * @private
     * @param {Object} result - 분석 결과 객체
     * @returns {Object} 평균값이 추가된 결과 객체
     */
    static _calculateAverages(result) {
        if (result.coloredPixels === 0) {
            return { ...result, avgR: 0, avgG: 0, avgB: 0, brightness: 255 };
        }

        const avgR = result.totalR / result.coloredPixels;
        const avgG = result.totalG / result.coloredPixels;
        const avgB = result.totalB / result.coloredPixels;
        const brightness = (avgR + avgG + avgB) / 3;

        return { ...result, avgR, avgG, avgB, brightness };
    }

    /**
     * RGB 값에서 지배적인 색상을 결정합니다.
     * @param {number} r - 빨강 값
     * @param {number} g - 초록 값
     * @param {number} b - 파랑 값
     * @returns {string} 지배적인 색상 이름
     */
    static getDominantColor(r, g, b) {
        if (r > 150 && g > 120 && b < 100) return CONFIG.COLORS.YELLOW_ORANGE;
        if (r > 100 && b > 100 && g < 100) return CONFIG.COLORS.PURPLE;
        if (r > g && r > b) return CONFIG.COLORS.RED_DOMINANT;
        if (b > r && b > g) return CONFIG.COLORS.BLUE_DOMINANT;
        if (g > r && g > b) return CONFIG.COLORS.GREEN_DOMINANT;
        return 'neutral';
    }
}

// ============================================================================
// 캔버스 관리 클래스
// ============================================================================

/**
 * 캔버스 드로잉 관리 클래스
 * @class CanvasManager
 */
class CanvasManager {
    /**
     * CanvasManager 인스턴스를 생성합니다.
     * @param {HTMLCanvasElement} canvas - 캔버스 엘리먼트
     * @param {HTMLElement} hint - 힌트 엘리먼트
     */
    constructor(canvas, hint) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hint = hint;
        
        // 드로잉 상태
        this.state = {
            isDrawing: false,
            mouseDown: false,
            lastX: 0,
            lastY: 0,
            currentColor: '#FF6B6B',
            isErasing: false,
            eraserSize: 20,
            penWidth: 5
        };

        this._initialize();
        this._bindEvents();
    }

    /**
     * 캔버스를 초기화합니다.
     * @private
     */
    _initialize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this._fillBackground();
    }

    /**
     * 캔버스 배경을 흰색으로 채웁니다.
     * @private
     */
    _fillBackground() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, rect.width, rect.height);
    }

    /**
     * 이벤트 핸들러를 바인딩합니다.
     * @private
     */
    _bindEvents() {
        // 마우스 이벤트
        this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this._handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this._handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
        this.canvas.addEventListener('mouseenter', this._handleMouseEnter.bind(this));

        // 전역 마우스 이벤트
        document.addEventListener('mousemove', this._handleGlobalMouseMove.bind(this));
        document.addEventListener('mouseup', this._handleGlobalMouseUp.bind(this));

        // 터치 이벤트
        this.canvas.addEventListener('touchstart', this._handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this._handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this._handleMouseUp.bind(this));
    }

    /**
     * 마우스 좌표를 계산합니다.
     * @private
     * @param {MouseEvent} event - 마우스 이벤트
     * @returns {Object} x, y 좌표
     */
    _getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    /**
     * 마우스 다운 이벤트 핸들러
     * @private
     * @param {MouseEvent} event - 마우스 이벤트
     */
    _handleMouseDown(event) {
        const pos = this._getMousePosition(event);
        this.state.isDrawing = true;
        this.state.mouseDown = true;
        this.state.lastX = pos.x;
        this.state.lastY = pos.y;
        this.hint.classList.add('hidden');
    }

    /**
     * 마우스 이동 이벤트 핸들러
     * @private
     * @param {MouseEvent} event - 마우스 이벤트
     */
    _handleMouseMove(event) {
        if (!this.state.isDrawing) return;

        const pos = this._getMousePosition(event);
        this._drawLine(this.state.lastX, this.state.lastY, pos.x, pos.y);
        this.state.lastX = pos.x;
        this.state.lastY = pos.y;
    }

    /**
     * 전역 마우스 이동 핸들러 (캔버스 밖에서도 그리기 지원)
     * @private
     * @param {MouseEvent} event - 마우스 이벤트
     */
    _handleGlobalMouseMove(event) {
        if (!this.state.mouseDown || !this.state.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));

        this._drawLine(this.state.lastX, this.state.lastY, x, y);
        this.state.lastX = x;
        this.state.lastY = y;
    }

    /**
     * 마우스 업 이벤트 핸들러
     * @private
     */
    _handleMouseUp() {
        this.state.isDrawing = false;
        this.state.mouseDown = false;
    }

    /**
     * 전역 마우스 업 핸들러
     * @private
     */
    _handleGlobalMouseUp() {
        this.state.mouseDown = false;
        this.state.isDrawing = false;
    }

    /**
     * 마우스 리브 이벤트 핸들러
     * @private
     */
    _handleMouseLeave() {
        // 마우스가 캔버스를 벗어나도 mouseDown 상태 유지
    }

    /**
     * 마우스 엔터 이벤트 핸들러
     * @private
     * @param {MouseEvent} event - 마우스 이벤트
     */
    _handleMouseEnter(event) {
        if (this.state.mouseDown) {
            this.state.isDrawing = true;
            const pos = this._getMousePosition(event);
            this.state.lastX = pos.x;
            this.state.lastY = pos.y;
        }
    }

    /**
     * 터치 시작 이벤트 핸들러
     * @private
     * @param {TouchEvent} event - 터치 이벤트
     */
    _handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        
        this.state.lastX = touch.clientX - rect.left;
        this.state.lastY = touch.clientY - rect.top;
        this.state.isDrawing = true;
        this.state.mouseDown = true;
        this.hint.classList.add('hidden');
    }

    /**
     * 터치 이동 이벤트 핸들러
     * @private
     * @param {TouchEvent} event - 터치 이벤트
     */
    _handleTouchMove(event) {
        if (!this.state.isDrawing) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        this._drawLine(this.state.lastX, this.state.lastY, x, y);
        this.state.lastX = x;
        this.state.lastY = y;
    }

    /**
     * 선을 그리거나 지웁니다.
     * @private
     * @param {number} fromX - 시작 X 좌표
     * @param {number} fromY - 시작 Y 좌표
     * @param {number} toX - 끝 X 좌표
     * @param {number} toY - 끝 Y 좌표
     */
    _drawLine(fromX, fromY, toX, toY) {
        if (this.state.isErasing) {
            this._erase(toX, toY);
        } else {
            this._draw(fromX, fromY, toX, toY);
        }
    }

    /**
     * 펜으로 선을 그립니다.
     * @private
     * @param {number} fromX - 시작 X 좌표
     * @param {number} fromY - 시작 Y 좌표
     * @param {number} toX - 끝 X 좌표
     * @param {number} toY - 끝 Y 좌표
     */
    _draw(fromX, fromY, toX, toY) {
        this.ctx.strokeStyle = this.state.currentColor;
        this.ctx.lineWidth = this.state.penWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();
    }

    /**
     * 지우개로 영역을 지웁니다.
     * @private
     * @param {number} x - X 좌표
     * @param {number} y - Y 좌표
     */
    _erase(x, y) {
        const size = this.state.eraserSize;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
        this.ctx.restore();
    }

    // ========== 공개 메서드 ==========

    /**
     * 펜 색상을 설정합니다.
     * @param {string} color - 색상 값
     */
    setColor(color) {
        this.state.currentColor = color;
        this.state.isErasing = false;
    }

    /**
     * 펜 크기를 설정합니다.
     * @param {number} size - 펜 크기
     */
    setPenSize(size) {
        this.state.penWidth = size;
    }

    /**
     * 지우개 모드를 활성화합니다.
     */
    enableEraser() {
        this.state.isErasing = true;
    }

    /**
     * 펜 모드를 활성화합니다.
     */
    enablePen() {
        this.state.isErasing = false;
    }

    /**
     * 지우개 크기를 설정합니다.
     * @param {number} size - 지우개 크기
     */
    setEraserSize(size) {
        this.state.eraserSize = size;
    }

    /**
     * 캔버스를 전체 지웁니다.
     */
    clear() {
        this._fillBackground();
        this.hint.classList.remove('hidden');
    }

    /**
     * 캔버스 이미지 데이터를 가져옵니다.
     * @returns {ImageData} 캔버스 이미지 데이터
     */
    getImageData() {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
}

// ============================================================================
// Web Audio 음악 생성 클래스
// ============================================================================

/**
 * Web Audio API 기반 음악 생성기 클래스
 * @class MusicGenerator
 */
class MusicGenerator {
    /**
     * MusicGenerator 인스턴스를 생성합니다.
     */
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.activeNodes = [];
    }

    /**
     * AudioContext를 초기화합니다.
     * @private
     */
    _initializeContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * 색상 분석 결과를 기반으로 음악 파라미터를 생성합니다.
     * @param {Object} colorData - 색상 분석 데이터
     * @returns {Object} 음악 생성 파라미터
     */
    generateMusicParams(colorData) {
        if (colorData.coloredPixels < CONFIG.CANVAS.MIN_COLORED_PIXELS) {
            return this._getDefaultParams();
        }

        const dominantColor = ColorAnalyzer.getDominantColor(
            colorData.avgR,
            colorData.avgG,
            colorData.avgB
        );

        return this._mapColorToMusicParams(dominantColor, colorData);
    }

    /**
     * 기본 음악 파라미터를 반환합니다.
     * @private
     * @returns {Object} 기본 파라미터
     */
    _getDefaultParams() {
        return {
            tempo: 80,
            scale: 'major',
            baseFreq: 261.63,
            mood: 'peaceful',
            colors: []
        };
    }

    /**
     * 색상을 음악 파라미터로 매핑합니다.
     * @private
     * @param {string} dominantColor - 지배적인 색상
     * @param {Object} colorData - 색상 분석 데이터
     * @returns {Object} 음악 파라미터
     */
    _mapColorToMusicParams(dominantColor, colorData) {
        const colorMappings = {
            [CONFIG.COLORS.RED_DOMINANT]: {
                tempo: 125 + Math.random() * 15,
                scale: 'mixolydian',
                baseFreq: 329.63,
                mood: 'energetic',
                chordProgression: 'energetic',
                melodyPattern: 'dramatic',
                rhythmPattern: 'energetic',
                waveType: 'sawtooth',
                filterFreq: 2000
            },
            [CONFIG.COLORS.BLUE_DOMINANT]: {
                tempo: 65 + Math.random() * 15,
                scale: 'dorian',
                baseFreq: 220.00,
                mood: 'calm',
                chordProgression: 'calm',
                melodyPattern: 'gentle',
                rhythmPattern: 'calm',
                waveType: 'sine',
                filterFreq: 600
            },
            [CONFIG.COLORS.GREEN_DOMINANT]: {
                tempo: 85 + Math.random() * 15,
                scale: 'pentatonic',
                baseFreq: 293.66,
                mood: 'natural',
                chordProgression: 'pop',
                melodyPattern: 'wave',
                rhythmPattern: 'flowing',
                waveType: 'triangle',
                filterFreq: 1000
            },
            [CONFIG.COLORS.YELLOW_ORANGE]: {
                tempo: 115 + Math.random() * 15,
                scale: 'major',
                baseFreq: 349.23,
                mood: 'happy',
                chordProgression: 'happy',
                melodyPattern: 'ascending',
                rhythmPattern: 'syncopated',
                waveType: 'triangle',
                filterFreq: 1500
            },
            [CONFIG.COLORS.PURPLE]: {
                tempo: 75 + Math.random() * 15,
                scale: 'blues',
                baseFreq: 261.63,
                mood: 'dreamy',
                chordProgression: 'dreamy',
                melodyPattern: 'wave',
                rhythmPattern: 'waltz',
                waveType: 'sine',
                filterFreq: 800
            },
            neutral: {
                tempo: 90,
                scale: 'major',
                baseFreq: 261.63,
                mood: 'neutral',
                chordProgression: 'pop',
                melodyPattern: 'gentle',
                rhythmPattern: 'steady',
                waveType: 'triangle',
                filterFreq: 1000
            }
        };

        const params = colorMappings[dominantColor] || colorMappings.neutral;
        
        // 밝기에 따른 조정
        if (colorData.brightness < 80) {
            params.tempo *= 0.85;
            params.baseFreq *= 0.75;
            params.filterFreq *= 0.7;
        } else if (colorData.brightness > 180) {
            params.tempo *= 1.1;
            params.baseFreq *= 1.15;
            params.filterFreq *= 1.3;
        }

        return {
            ...params,
            colors: colorData.colors.slice(0, 50)
        };
    }

    /**
     * 반음 간격으로 주파수를 계산합니다.
     * @private
     * @param {number} baseFreq - 기본 주파수
     * @param {number} semitones - 반음 수
     * @returns {number} 계산된 주파수
     */
    _calculateFrequency(baseFreq, semitones) {
        return baseFreq * Math.pow(2, semitones / 12);
    }

    /**
     * 음악을 생성하고 재생합니다.
     * @param {Object} params - 음악 생성 파라미터
     * @returns {string} 생성된 음악의 분위기
     */
    play(params) {
        this._initializeContext();
        this.stop();

        const { tempo, scale, baseFreq, mood, colors, chordProgression, melodyPattern, rhythmPattern, waveType, filterFreq } = params;
        const scaleNotes = MUSICAL_SCALES[scale] || MUSICAL_SCALES.major;
        const beatDuration = 60 / tempo;
        const totalDuration = CONFIG.AUDIO.DEFAULT_DURATION;

        // 오디오 노드 설정
        const masterGain = this._createMasterGain();
        const delay = this._createDelayEffect(masterGain);
        const reverb = this._createReverbEffect(masterGain);

        // 향상된 음악 레이어 생성
        this._generateChordProgression(chordProgression || 'pop', baseFreq, beatDuration, totalDuration, masterGain, filterFreq || 1000);
        this._generateImprovedBassLine(scaleNotes, baseFreq, beatDuration, totalDuration, masterGain, rhythmPattern || 'steady');
        this._generateImprovedMelody(scaleNotes, baseFreq, beatDuration, totalDuration, masterGain, delay, melodyPattern || 'gentle', rhythmPattern || 'steady', waveType || 'triangle');
        this._generateColorArpeggio(colors, scaleNotes, baseFreq, totalDuration, reverb, waveType || 'sine');
        this._generateAtmosphere(baseFreq, totalDuration, masterGain, mood);

        this.isPlaying = true;

        // 자동 정지 타이머
        setTimeout(() => this.stop(), totalDuration * 1000);

        return mood;
    }

    /**
     * 마스터 게인 노드를 생성합니다.
     * @private
     * @returns {GainNode} 마스터 게인 노드
     */
    _createMasterGain() {
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = CONFIG.AUDIO.MASTER_VOLUME;
        masterGain.connect(this.audioContext.destination);
        this.activeNodes.push(masterGain);
        return masterGain;
    }

    /**
     * 딜레이 이펙트를 생성합니다.
     * @private
     * @param {GainNode} destination - 연결할 노드
     * @returns {DelayNode} 딜레이 노드
     */
    _createDelayEffect(destination) {
        const delay = this.audioContext.createDelay();
        delay.delayTime.value = CONFIG.AUDIO.DELAY_TIME;
        
        const delayGain = this.audioContext.createGain();
        delayGain.gain.value = CONFIG.AUDIO.DELAY_FEEDBACK;
        
        delay.connect(delayGain);
        delayGain.connect(destination);
        
        this.activeNodes.push(delay, delayGain);
        return delay;
    }

    /**
     * 리버브 이펙트를 생성합니다.
     * @private
     * @param {GainNode} destination - 연결할 노드
     * @returns {GainNode} 리버브 출력 노드
     */
    _createReverbEffect(destination) {
        const convolver = this.audioContext.createConvolver();
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.3;
        
        // 간단한 리버브 임펄스 생성
        const rate = this.audioContext.sampleRate;
        const length = rate * 2;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        convolver.connect(reverbGain);
        reverbGain.connect(destination);
        
        this.activeNodes.push(convolver, reverbGain);
        return reverbGain;
    }

    /**
     * 코드 진행을 생성합니다.
     * @private
     */
    _generateChordProgression(progressionName, baseFreq, beatDuration, totalDuration, destination, filterFreq) {
        const progression = CHORD_PROGRESSIONS[progressionName] || CHORD_PROGRESSIONS.pop;
        const chordDuration = totalDuration / progression.length;
        
        progression.forEach((chord, index) => {
            const startTime = this.audioContext.currentTime + index * chordDuration;
            
            chord.forEach(semitone => {
                const freq = this._calculateFrequency(baseFreq * 0.5, semitone);
                this._playFilteredPad(freq, startTime, chordDuration * 0.95, destination, filterFreq);
            });
        });
    }

    /**
     * 향상된 베이스 라인을 생성합니다.
     * @private
     */
    _generateImprovedBassLine(scaleNotes, baseFreq, beatDuration, totalDuration, destination, rhythmPatternName) {
        const rhythmPattern = RHYTHM_PATTERNS[rhythmPatternName] || RHYTHM_PATTERNS.steady;
        let currentTime = this.audioContext.currentTime;
        let patternIndex = 0;
        let lastNoteIndex = 0;
        
        while (currentTime < this.audioContext.currentTime + totalDuration) {
            const duration = beatDuration * rhythmPattern[patternIndex % rhythmPattern.length];
            
            // 음악적인 베이스 진행 (루트 → 5도 → 옥타브 패턴)
            const bassPattern = [0, 0, 4, 0, 2, 4, 0, 2];
            const noteIndex = bassPattern[patternIndex % bassPattern.length] % scaleNotes.length;
            const freq = this._calculateFrequency(baseFreq / 2, scaleNotes[noteIndex]);
            
            // 다이나믹스 추가 (강약)
            const volume = 0.12 + (patternIndex % 4 === 0 ? 0.05 : 0);
            
            this._playNote(freq, currentTime, duration * 0.85, 'sine', volume, destination);
            
            currentTime += duration;
            patternIndex++;
            lastNoteIndex = noteIndex;
        }
    }

    /**
     * 향상된 멜로디를 생성합니다.
     * @private
     */
    _generateImprovedMelody(scaleNotes, baseFreq, beatDuration, totalDuration, masterGain, delay, melodyPatternName, rhythmPatternName, waveType) {
        const melodyPattern = MELODY_PATTERNS[melodyPatternName] || MELODY_PATTERNS.gentle;
        const rhythmPattern = RHYTHM_PATTERNS[rhythmPatternName] || RHYTHM_PATTERNS.steady;
        
        let currentTime = this.audioContext.currentTime + beatDuration * 2; // 약간의 딜레이 후 시작
        let patternIndex = 0;
        let baseNoteIndex = 2; // 중간 음역에서 시작
        
        // 프레이즈 구조: 8박 단위로 멜로디 구성
        const phraseLength = 8;
        let phraseCount = 0;
        
        while (currentTime < this.audioContext.currentTime + totalDuration - beatDuration) {
            const rhythmValue = rhythmPattern[patternIndex % rhythmPattern.length];
            const duration = beatDuration * rhythmValue;
            
            // 멜로디 패턴에 따른 음정 변화
            const patternOffset = melodyPattern[patternIndex % melodyPattern.length];
            let noteIndex = (baseNoteIndex + patternOffset) % scaleNotes.length;
            if (noteIndex < 0) noteIndex += scaleNotes.length;
            
            const freq = this._calculateFrequency(baseFreq, scaleNotes[noteIndex]);
            
            // 프레이즈에 따른 다이나믹스
            const phrasePosition = patternIndex % phraseLength;
            let volume = 0.10;
            if (phrasePosition === 0) volume = 0.14; // 프레이즈 시작은 강하게
            else if (phrasePosition === phraseLength - 1) volume = 0.06; // 끝은 약하게
            
            // 간헐적 쉼표 (더 자연스러운 멜로디)
            const shouldPlay = Math.random() > 0.15;
            
            if (shouldPlay) {
                this._playNote(freq, currentTime, duration * 0.75, waveType, volume, masterGain);
                
                // 에코 효과
                if (duration >= beatDuration * 1.5) {
                    this._playNote(freq, currentTime, duration * 0.75, waveType, volume * 0.4, delay);
                }
            }
            
            currentTime += duration;
            patternIndex++;
            
            // 프레이즈가 끝나면 베이스 음 변경
            if (patternIndex % phraseLength === 0) {
                baseNoteIndex = (baseNoteIndex + [2, -1, 3, -2][phraseCount % 4]) % scaleNotes.length;
                if (baseNoteIndex < 0) baseNoteIndex += scaleNotes.length;
                phraseCount++;
            }
        }
    }

    /**
     * 색상 기반 아르페지오를 생성합니다.
     * @private
     */
    _generateColorArpeggio(colors, scaleNotes, baseFreq, totalDuration, destination, waveType) {
        if (colors.length === 0) return;
        
        const uniqueColors = this._getUniqueColors(colors, 20);
        const arpDuration = totalDuration / uniqueColors.length;
        
        uniqueColors.forEach((color, index) => {
            const time = this.audioContext.currentTime + index * arpDuration;
            
            // 색상의 RGB 값으로 코드 구성
            const rootIndex = Math.floor(color.r / 40) % scaleNotes.length;
            const thirdIndex = Math.floor(color.g / 40) % scaleNotes.length;
            const fifthIndex = Math.floor(color.b / 40) % scaleNotes.length;
            
            // 아르페지오 패턴으로 재생
            const arpeggioPattern = [rootIndex, thirdIndex, fifthIndex, thirdIndex];
            const noteTime = arpDuration / arpeggioPattern.length;
            
            arpeggioPattern.forEach((noteIdx, i) => {
                const freq = this._calculateFrequency(baseFreq * 1.5, scaleNotes[noteIdx]);
                const volume = 0.04 + (i === 0 ? 0.02 : 0);
                this._playNote(freq, time + i * noteTime, noteTime * 0.8, waveType, volume, destination);
            });
        });
    }

    /**
     * 유니크한 색상들을 추출합니다.
     * @private
     */
    _getUniqueColors(colors, count) {
        const step = Math.max(1, Math.floor(colors.length / count));
        const result = [];
        for (let i = 0; i < colors.length && result.length < count; i += step) {
            result.push(colors[i]);
        }
        return result;
    }

    /**
     * 분위기에 맞는 배경 사운드를 생성합니다.
     * @private
     */
    _generateAtmosphere(baseFreq, totalDuration, destination, mood) {
        const moodSettings = {
            energetic: { freqMult: [1, 1.5, 2], volume: 0.06, filterFreq: 1500 },
            calm: { freqMult: [0.5, 1, 1.25], volume: 0.04, filterFreq: 400 },
            natural: { freqMult: [1, 1.33, 1.5], volume: 0.05, filterFreq: 800 },
            happy: { freqMult: [1, 1.25, 1.5], volume: 0.05, filterFreq: 1200 },
            dreamy: { freqMult: [1, 1.2, 1.5, 2], volume: 0.04, filterFreq: 600 },
            neutral: { freqMult: [1, 1.5], volume: 0.04, filterFreq: 800 },
            peaceful: { freqMult: [1, 1.5, 2], volume: 0.03, filterFreq: 500 }
        };
        
        const settings = moodSettings[mood] || moodSettings.neutral;
        
        settings.freqMult.forEach((mult, index) => {
            const freq = baseFreq * 0.25 * mult;
            const startOffset = index * 0.5;
            this._playFilteredPad(freq, this.audioContext.currentTime + startOffset, totalDuration - startOffset, destination, settings.filterFreq, settings.volume);
        });
    }

    /**
     * 필터가 적용된 패드 사운드를 재생합니다.
     * @private
     */
    _playFilteredPad(freq, startTime, duration, destination, filterFreq, volume = 0.06) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        // LFO로 약간의 움직임 추가
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.frequency.value = 0.5 + Math.random() * 0.5;
        lfoGain.gain.value = freq * 0.02;
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        lfo.start(startTime);
        lfo.stop(startTime + duration + 0.1);
        
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = 1;
        
        // 부드러운 페이드 인/아웃
        const fadeTime = Math.min(duration * 0.3, 2);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + fadeTime);
        gainNode.gain.setValueAtTime(volume, startTime + duration - fadeTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.1);
        
        this.activeNodes.push(oscillator, gainNode, filter, lfo, lfoGain);
    }

    /**
     * 베이스 라인을 생성합니다. (레거시 호환)
     * @private
     */
    _generateBassLine(scaleNotes, baseFreq, beatDuration, totalDuration, destination) {
        this._generateImprovedBassLine(scaleNotes, baseFreq, beatDuration, totalDuration, destination, 'steady');
    }

    /**
     * 멜로디를 생성합니다. (레거시 호환)
     * @private
     */
    _generateMelody(scaleNotes, baseFreq, beatDuration, totalDuration, masterGain, delay) {
        this._generateImprovedMelody(scaleNotes, baseFreq, beatDuration, totalDuration, masterGain, delay, 'gentle', 'steady', 'triangle');
    }

    /**
     * 아르페지오를 생성합니다. (레거시 호환)
     * @private
     */
    _generateArpeggio(colors, scaleNotes, baseFreq, totalDuration, destination) {
        this._generateColorArpeggio(colors, scaleNotes, baseFreq, totalDuration, destination, 'sine');
    }

    /**
     * 패드 코드를 생성합니다.
     * @private
     */
    _generatePadChord(scaleNotes, baseFreq, totalDuration, destination) {
        const chordFrequencies = [
            this._calculateFrequency(baseFreq, 0),
            this._calculateFrequency(baseFreq, scaleNotes[2] || 4),
            this._calculateFrequency(baseFreq, scaleNotes[4] || 7)
        ];
        
        chordFrequencies.forEach(freq => {
            this._playPad(freq, this.audioContext.currentTime, totalDuration, destination);
        });
    }

    /**
     * 단일 음을 재생합니다.
     * @private
     * @param {number} freq - 주파수
     * @param {number} startTime - 시작 시간
     * @param {number} duration - 지속 시간
     * @param {string} waveType - 파형 타입
     * @param {number} volume - 볼륨
     * @param {AudioNode} destination - 연결할 노드
     */
    _playNote(freq, startTime, duration, waveType, volume, destination) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = waveType;
        oscillator.frequency.value = freq;
        
        // ADSR 엔벨로프
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.1);
        
        this.activeNodes.push(oscillator, gainNode);
    }

    /**
     * 패드 사운드를 재생합니다.
     * @private
     * @param {number} freq - 주파수
     * @param {number} startTime - 시작 시간
     * @param {number} duration - 지속 시간
     * @param {AudioNode} destination - 연결할 노드
     */
    _playPad(freq, startTime, duration, destination) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        
        // 느린 ADSR 엔벨로프
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + 2);
        gainNode.gain.setValueAtTime(0.08, startTime + duration - 2);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.1);
        
        this.activeNodes.push(oscillator, gainNode, filter);
    }

    /**
     * 재생 중인 음악을 정지합니다.
     */
    stop() {
        this.activeNodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch (error) {
                // 이미 정지된 노드 무시
            }
        });
        this.activeNodes = [];
        this.isPlaying = false;
    }
}

// ============================================================================
// Spotify API 클래스
// ============================================================================

/**
 * Spotify API 통신 클래스
 * @class SpotifyAPI
 */
class SpotifyAPI {
    /**
     * SpotifyAPI 인스턴스를 생성합니다.
     * @param {string} clientId - Spotify Client ID
     * @param {string} clientSecret - Spotify Client Secret
     */
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = null;
    }

    /**
     * 액세스 토큰을 발급받습니다.
     * @async
     * @returns {Promise<string>} 액세스 토큰
     * @throws {Error} 인증 실패 시 에러
     */
    async authenticate() {
        const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
        
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            throw new Error('Spotify 인증 실패. Client ID와 Secret을 확인해주세요.');
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        return this.accessToken;
    }

    /**
     * 트랙을 검색합니다.
     * @async
     * @param {string} query - 검색 쿼리
     * @param {number} [limit=5] - 결과 개수 제한
     * @returns {Promise<Array>} 검색된 트랙 목록
     * @throws {Error} 검색 실패 시 에러
     */
    async searchTracks(query, limit = 5) {
        if (!this.accessToken) {
            await this.authenticate();
        }

        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Spotify 검색 실패');
        }

        const data = await response.json();
        return data.tracks.items;
    }

    /**
     * 색상 분석 데이터를 기반으로 검색 파라미터를 생성합니다.
     * @static
     * @param {Object} colorData - 색상 분석 데이터
     * @returns {Object} 검색 파라미터
     */
    static generateSearchParams(colorData) {
        if (colorData.coloredPixels < CONFIG.CANVAS.MIN_COLORED_PIXELS) {
            return { genre: 'ambient', mood: 'peaceful', query: 'peaceful ambient' };
        }

        const dominantColor = ColorAnalyzer.getDominantColor(
            colorData.avgR,
            colorData.avgG,
            colorData.avgB
        );

        const colorMappings = {
            [CONFIG.COLORS.RED_DOMINANT]: {
                genre: 'rock',
                mood: 'energetic',
                query: 'energetic rock powerful'
            },
            [CONFIG.COLORS.BLUE_DOMINANT]: {
                genre: 'jazz',
                mood: 'calm',
                query: 'calm jazz relaxing'
            },
            [CONFIG.COLORS.GREEN_DOMINANT]: {
                genre: 'acoustic',
                mood: 'natural',
                query: 'acoustic nature peaceful'
            },
            [CONFIG.COLORS.YELLOW_ORANGE]: {
                genre: 'pop',
                mood: 'happy',
                query: 'happy pop upbeat'
            },
            [CONFIG.COLORS.PURPLE]: {
                genre: 'electronic',
                mood: 'dreamy',
                query: 'dreamy electronic chill'
            },
            neutral: {
                genre: 'indie',
                mood: 'neutral',
                query: 'indie chill vibes'
            }
        };

        const params = colorMappings[dominantColor] || colorMappings.neutral;

        // 밝기에 따른 쿼리 조정
        if (colorData.brightness < 80) {
            params.query += ' dark moody';
        } else if (colorData.brightness > 180) {
            params.query += ' bright uplifting';
        }

        return params;
    }
}

// ============================================================================
// UI 컨트롤러 클래스
// ============================================================================

/**
 * UI 상호작용 관리 클래스
 * @class UIController
 */
class UIController {
    /**
     * UIController 인스턴스를 생성합니다.
     * @param {CanvasManager} canvasManager - 캔버스 매니저
     * @param {MusicGenerator} musicGenerator - 음악 생성기
     */
    constructor(canvasManager, musicGenerator) {
        this.canvasManager = canvasManager;
        this.musicGenerator = musicGenerator;
        this.elements = this._cacheElements();
        this._bindUIEvents();
    }

    /**
     * DOM 엘리먼트를 캐싱합니다.
     * @private
     * @returns {Object} 캐싱된 엘리먼트 객체
     */
    _cacheElements() {
        return {
            colorBtns: document.querySelectorAll('.color-btn'),
            customColor: document.getElementById('custom-color'),
            penTool: document.getElementById('pen-tool'),
            eraserBtn: document.getElementById('eraser'),
            clearBtn: document.getElementById('clear'),
            penSizeSlider: document.getElementById('pen-size'),
            eraserSizeSlider: document.getElementById('eraser-size'),
            eraserSizeSection: document.getElementById('eraser-size-section'),
            generateBtn: document.getElementById('generate-music'),
            musicResult: document.getElementById('music-result'),
            spotifyClientId: document.getElementById('spotify-client-id'),
            spotifyClientSecret: document.getElementById('spotify-client-secret'),
            toggleSecretBtn: document.getElementById('toggle-secret'),
            recommendBtn: document.getElementById('recommend-music'),
            spotifyResult: document.getElementById('spotify-result')
        };
    }

    /**
     * UI 이벤트를 바인딩합니다.
     * @private
     */
    _bindUIEvents() {
        this._bindColorEvents();
        this._bindToolEvents();
        this._bindMusicGeneratorEvents();
        this._bindSpotifyEvents();
    }

    /**
     * 색상 관련 이벤트를 바인딩합니다.
     * @private
     */
    _bindColorEvents() {
        const { colorBtns, customColor } = this.elements;

        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this._setActiveColorButton(btn);
                this.canvasManager.setColor(btn.dataset.color);
                this._switchToPen();
            });
        });

        customColor.addEventListener('input', (e) => {
            this._clearActiveColorButtons();
            this.canvasManager.setColor(e.target.value);
            this._switchToPen();
        });
    }

    /**
     * 도구 관련 이벤트를 바인딩합니다.
     * @private
     */
    _bindToolEvents() {
        const { penTool, eraserBtn, clearBtn, penSizeSlider, eraserSizeSlider } = this.elements;

        penTool.addEventListener('click', () => this._switchToPen());
        
        eraserBtn.addEventListener('click', () => this._switchToEraser());
        
        clearBtn.addEventListener('click', () => this.canvasManager.clear());

        penSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.canvasManager.setPenSize(size);
            document.querySelector('.size-value').textContent = `${size}px`;
        });

        eraserSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.canvasManager.setEraserSize(size);
            document.querySelector('.eraser-size-value').textContent = `${size}px`;
        });
    }

    /**
     * 음악 생성 관련 이벤트를 바인딩합니다.
     * @private
     */
    _bindMusicGeneratorEvents() {
        const { generateBtn } = this.elements;

        generateBtn.addEventListener('click', () => this._handleMusicGeneration());
    }

    /**
     * Spotify 관련 이벤트를 바인딩합니다.
     * @private
     */
    _bindSpotifyEvents() {
        const { toggleSecretBtn, spotifyClientSecret, recommendBtn } = this.elements;

        if (toggleSecretBtn && spotifyClientSecret) {
            toggleSecretBtn.addEventListener('click', () => {
                const isPassword = spotifyClientSecret.type === 'password';
                spotifyClientSecret.type = isPassword ? 'text' : 'password';
                toggleSecretBtn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
            });
        }

        if (recommendBtn) {
            recommendBtn.addEventListener('click', () => this._handleSpotifyRecommendation());
        }
    }

    /**
     * 펜 모드로 전환합니다.
     * @private
     */
    _switchToPen() {
        const { penTool, eraserBtn, eraserSizeSection } = this.elements;
        this.canvasManager.enablePen();
        penTool.classList.add('active');
        eraserBtn.classList.remove('active');
        eraserSizeSection.classList.remove('show');
    }

    /**
     * 지우개 모드로 전환합니다.
     * @private
     */
    _switchToEraser() {
        const { penTool, eraserBtn, eraserSizeSection } = this.elements;
        this.canvasManager.enableEraser();
        eraserBtn.classList.add('active');
        penTool.classList.remove('active');
        eraserSizeSection.classList.add('show');
        this._clearActiveColorButtons();
    }

    /**
     * 활성 색상 버튼을 설정합니다.
     * @private
     * @param {HTMLElement} activeBtn - 활성화할 버튼
     */
    _setActiveColorButton(activeBtn) {
        this.elements.colorBtns.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    /**
     * 모든 색상 버튼의 활성 상태를 제거합니다.
     * @private
     */
    _clearActiveColorButtons() {
        this.elements.colorBtns.forEach(btn => btn.classList.remove('active'));
    }

    /**
     * 음악 생성을 처리합니다.
     * @private
     */
    _handleMusicGeneration() {
        const { generateBtn } = this.elements;
        
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;

        try {
            const imageData = this.canvasManager.getImageData();
            const colorData = ColorAnalyzer.analyze(imageData);
            
            if (colorData.colors.length < 5) {
                this._showMusicResult('error', '먼저 캔버스에 그림을 그려주세요! 🎨');
                return;
            }
            
            const params = this.musicGenerator.generateMusicParams(colorData);
            const mood = this.musicGenerator.play(params);
            
            this._showMusicResult('success', this._createMusicResultHTML(mood, params));
            this._bindMusicControlEvents(params);

        } catch (error) {
            console.error('Music generation error:', error);
            this._showMusicResult('error', `오류: ${error.message}`);
        } finally {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
        }
    }

    /**
     * 음악 결과 HTML을 생성합니다.
     * @private
     * @param {string} mood - 분위기
     * @param {Object} params - 음악 파라미터
     * @returns {string} HTML 문자열
     */
    _createMusicResultHTML(mood, params) {
        const moodText = MOOD_DESCRIPTIONS[mood] || MOOD_DESCRIPTIONS.neutral;
        
        return `
            <div class="result-title">
                <i class="fas fa-music"></i>
                <span>${moodText} 음악이 생성되었습니다!</span>
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
        `;
    }

    /**
     * 음악 컨트롤 이벤트를 바인딩합니다.
     * @private
     * @param {Object} params - 음악 파라미터
     */
    _bindMusicControlEvents(params) {
        setTimeout(() => {
            const stopBtn = document.getElementById('stop-music');
            const replayBtn = document.getElementById('replay-music');
            
            if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                    this.musicGenerator.stop();
                    stopBtn.innerHTML = '<i class="fas fa-check"></i> 정지됨';
                });
            }
            
            if (replayBtn) {
                replayBtn.addEventListener('click', () => {
                    this.musicGenerator.play(params);
                });
            }
        }, 100);
    }

    /**
     * Spotify 추천을 처리합니다.
     * @private
     * @async
     */
    async _handleSpotifyRecommendation() {
        const { spotifyClientId, spotifyClientSecret, recommendBtn } = this.elements;
        
        const clientId = spotifyClientId.value.trim();
        const clientSecret = spotifyClientSecret.value.trim();
        
        if (!clientId || !clientSecret) {
            this._showSpotifyResult('error', 'Spotify Client ID와 Client Secret을 입력해주세요.');
            return;
        }

        recommendBtn.disabled = true;
        recommendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 검색 중...';

        try {
            this._showSpotifyResult('info', '<i class="fas fa-spinner fa-spin"></i> Spotify에서 노래를 찾고 있어요...');

            const imageData = this.canvasManager.getImageData();
            const colorData = ColorAnalyzer.analyze(imageData);
            const searchParams = SpotifyAPI.generateSearchParams(colorData);

            const spotifyAPI = new SpotifyAPI(clientId, clientSecret);
            await spotifyAPI.authenticate();
            const tracks = await spotifyAPI.searchTracks(searchParams.query);

            if (tracks.length === 0) {
                this._showSpotifyResult('error', '추천할 노래를 찾지 못했어요. 다시 시도해주세요.');
                return;
            }

            this._showSpotifyResult('success', this._createSpotifyResultHTML(tracks, searchParams.mood));

        } catch (error) {
            console.error('Spotify error:', error);
            this._showSpotifyResult('error', `오류: ${error.message}`);
        } finally {
            recommendBtn.disabled = false;
            recommendBtn.innerHTML = '<i class="fab fa-spotify"></i> <span>노래 추천 받기</span>';
        }
    }

    /**
     * Spotify 결과 HTML을 생성합니다.
     * @private
     * @param {Array} tracks - 트랙 목록
     * @param {string} mood - 분위기
     * @returns {string} HTML 문자열
     */
    _createSpotifyResultHTML(tracks, mood) {
        let html = `
            <div class="result-title" style="color: #1DB954;">
                <i class="fab fa-spotify"></i>
                <span>그림에 어울리는 노래 (${mood})</span>
            </div>
            <div style="margin-top: 16px;">
        `;

        tracks.forEach(track => {
            html += `
                <div class="spotify-embed-track">
                    <iframe 
                        style="border-radius:12px" 
                        src="https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0" 
                        width="100%" 
                        height="152" 
                        frameBorder="0" 
                        allowfullscreen="" 
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                        loading="lazy">
                    </iframe>
                </div>
            `;
        });

        return html + '</div>';
    }

    /**
     * 음악 결과를 표시합니다.
     * @private
     * @param {string} type - 결과 타입 (error, info, success)
     * @param {string} content - 표시할 내용
     */
    _showMusicResult(type, content) {
        const { musicResult } = this.elements;
        musicResult.classList.add('show');
        
        const styles = {
            error: 'color: #FF6B6B;',
            info: 'color: #60A5FA;',
            success: ''
        };

        if (type === 'error' || type === 'info') {
            const icon = type === 'error' ? 'exclamation-circle' : '';
            musicResult.innerHTML = `<div style="${styles[type]}"><i class="fas fa-${icon}"></i> ${content}</div>`;
        } else {
            musicResult.innerHTML = content;
        }
    }

    /**
     * Spotify 결과를 표시합니다.
     * @private
     * @param {string} type - 결과 타입 (error, info, success)
     * @param {string} content - 표시할 내용
     */
    _showSpotifyResult(type, content) {
        const { spotifyResult } = this.elements;
        spotifyResult.classList.add('show');
        
        const styles = {
            error: 'color: #FF6B6B;',
            info: 'color: #1DB954;',
            success: ''
        };

        if (type === 'error') {
            spotifyResult.innerHTML = `<div style="${styles.error}"><i class="fas fa-exclamation-circle"></i> ${content}</div>`;
        } else if (type === 'info') {
            spotifyResult.innerHTML = `<div style="${styles.info}">${content}</div>`;
        } else {
            spotifyResult.innerHTML = content;
        }
    }
}

// ============================================================================
// 애플리케이션 초기화
// ============================================================================

/**
 * 애플리케이션 메인 클래스
 * @class Art2MusicApp
 */
class Art2MusicApp {
    /**
     * 애플리케이션을 초기화합니다.
     */
    constructor() {
        this.canvasManager = null;
        this.musicGenerator = null;
        this.uiController = null;
    }

    /**
     * 애플리케이션을 시작합니다.
     */
    initialize() {
        const canvas = document.getElementById('canvas');
        const canvasHint = document.getElementById('canvas-hint');

        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }

        this.canvasManager = new CanvasManager(canvas, canvasHint);
        this.musicGenerator = new MusicGenerator();
        this.uiController = new UIController(this.canvasManager, this.musicGenerator);

        console.log('Art2Music Application initialized successfully');
    }
}

// DOM 로드 완료 후 애플리케이션 시작
window.addEventListener('DOMContentLoaded', () => {
    const app = new Art2MusicApp();
    app.initialize();
});
