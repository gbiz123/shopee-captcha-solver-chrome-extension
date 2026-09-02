interface Request {
	apiKey: string
}

(function() {
	if ((window as any).hasRun === true)
		return true;
	(window as any).hasRun = true;

	const CONTAINER: Element = document.documentElement || document.body

	chrome.runtime.onMessage.addListener(
		function(request: Request, _, sendResponse) {
			if (request.apiKey !== null) {
				localStorage.setItem("sadCaptchaKey", request.apiKey)
				sendResponse({ message: "API key set.", success: 1 })
			} else {
				sendResponse({ message: "API key cannot be empty.", success: 0 })
			}
		}
	)

	function getApiKey(): string {
		let apiKey = localStorage.getItem("sadCaptchaKey")
		if (apiKey) {
			return apiKey
		} else {
			throw new Error("could not get sadCaptchaKey from localStorage")
		}
	}

	let creditsUrl = "https://www.sadcaptcha.com/api/v1/license/credits?licenseKey="
	let imageCrawlUrl = "https://www.sadcaptcha.com/api/v1/shopee-image-crawl?licenseKey="
	let imageCrawlPreAnalyzeUrl = "https://www.sadcaptcha.com/api/v1/shopee-image-crawl-pre-analyze?licenseKey="
	let puzzleUrl = "https://www.sadcaptcha.com/api/v1/puzzle?licenseKey="
	let imageDragUrl = "https://www.sadcaptcha.com/api/v1/shopee-image-drag?licenseKey="

	const API_HEADERS = new Headers({ "Content-Type": "application/json" })

	const IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR = "#NEW_CAPTCHA canvas[draggable=false], aside canvas[draggable=false], div:not(#puzzleContainer) > img"
	const IMAGE_CRAWL_PIECE_IMAGE_SELECTOR = "#NEW_CAPTCHA canvas[draggable=true], aside canvas[draggable=true], #puzzleContainer > #puzzleImgComponent"
	const IMAGE_CRAWL_BUTTON_SELECTOR = "div:has(> svg + svg)"
	const IMAGE_CRAWL_RESET_BUTTON = "#NEW_CAPTCHA svg[viewBox='0 0 16 16'], aside svg[viewBox='0 0 16 16']"
	const IMAGE_CRAWL_UNIQUE_IDENTIFIERS = [IMAGE_CRAWL_PIECE_IMAGE_SELECTOR]

	const PUZZLE_BUTTON_SELECTOR = "aside[aria-modal=true] div[style=\"width: 40px; height: 40px; transform: translateX(0px);\"]"
	const PUZZLE_PUZZLE_IMAGE_SELECTOR = "aside[aria-modal=true] div[aria-hidden=true] > div > div > img[draggable=false]"
	const PUZZLE_PIECE_IMAGE_SELECTOR = "aside[aria-modal=true] div[aria-hidden=true] > div > div > img[draggable=true]"
	const PUZZLE_UNIQUE_IDENTIFIERS = [PUZZLE_PIECE_IMAGE_SELECTOR]

	const IMAGE_DRAG_VERIFY_BUTTON_SELECTOR = ".rb6XLo, #NEW_CAPTCHA button:not(:has(*)), aside button:not(:has(*)) "
	const IMAGE_DRAG_PUZZLE_IMAGE_SELECTOR = "#NEW_CAPTCHA canvas, aside canvas"
	const IMAGE_DRAG_PIECE_IMAGE_SELECTOR = "#NEW_CAPTCHA img, aside img"
	const IMAGE_DRAG_UNIQUE_IDENTIFIERS = [IMAGE_DRAG_PUZZLE_IMAGE_SELECTOR, IMAGE_DRAG_VERIFY_BUTTON_SELECTOR]

	const CAPTCHA_PRESENCE_INDICATORS = [
		"aside[aria-modal=true] div[style=\"width: 40px; height: 40px; transform: translateX(0px);\"]",
		"#NEW_CAPTCHA",
		"#captchaMask",
		IMAGE_CRAWL_PIECE_IMAGE_SELECTOR,
		IMAGE_DRAG_PUZZLE_IMAGE_SELECTOR,
		IMAGE_CRAWL_RESET_BUTTON
	]

	type SingleImageRequest = {
		image_b64: string
	}

	type ImageCrawlPreAnalyzeResponse = {
		version: string,
		slideXProportion: number,
		skipRecommended: boolean
	}

	type Point = {
		x: number
		y: number
	}

	type ProportionalPoint = {
		proportionX: number
		proportionY: number
	}

	type TrajectoryElement = {
		pixels_from_slider_origin: number
		piece_rotation_angle: number
		piece_center: ProportionalPoint
	}

	type ImageCrawlCaptchaRequest = {
		puzzle_image_b64: string
		piece_image_b64: string
		slide_piece_trajectory: Array<TrajectoryElement>
	}

	type MultiPointResponse = {
		proportionalPoints: Array<ProportionalPoint>
	}

	enum CaptchaType {
		PUZZLE,
		IMAGE_CRAWL,
		SEMANTIC_SHAPES,
		IMAGE_DRAG
	}

	const SCATTER_SWEEP = true
	const SCATTER_BLOCK_PX = 30

	const GESTURE_AMP_U = 1.5
	const GESTURE_PASSES = 4
	const GESTURE_PACE_MS = 2

	const SWING_SAFE_PX = 12

	const PAUSE_BEFORE_NUDGE_MS = [900, 2100]
	const PAUSE_BEFORE_RELEASE_MS = [750, 1450]

	const SKIP_CAP = 3

	const PRESS_SETTLE_MS = 150
	const SAMPLE_SETTLE_MS = 20

	const OVERSHOOT_PX = 15

	const MIN_TRAJECTORY_ROWS = 12

	const INTERPOLATE_MOVES = false

	function between(range: Array<number>): number {
		return range[0] + Math.random() * (range[1] - range[0])
	}

	function findFirstElementToAppear(selectors: Array<string>): Promise<Element> {
		return new Promise(resolve => {
			const observer: MutationObserver = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.addedNodes === null)
					continue
				let addedNode: Array<Node> = []
				mutation.addedNodes.forEach(node => addedNode.push(node))
				for (const node of addedNode)
					for (const selector of selectors) {
						try {
							if (node instanceof HTMLIFrameElement) {
								let iframe = <HTMLIFrameElement>node
								setTimeout(() => {
									if (iframe.contentWindow) {
										let iframeElement = iframe.contentWindow!.document.body.querySelector(selector)
										if (iframeElement) {
											observer.disconnect()

											return resolve(iframeElement)
										}
									}
								}, 3000)
							}

							if (node instanceof Element) {
								let element = <Element>node
								if (element.querySelector(selector)) {
									observer.disconnect()

									return resolve(element)
								}
							}
						} catch (err) {
						}
					}
				}
			})
			observer.observe(CONTAINER, {
				childList: true,
				subtree: true
			})
		})
	}

	function waitForElement(selector: string, iframeSelector?: string): Promise<Element> {
		for (let i = 0; i < 5; i++) {
			try {
				return new Promise(resolve => {
					let targetDocument: Document;
					if (iframeSelector !== undefined) {
						let iframe = document.querySelector(iframeSelector) as HTMLIFrameElement
						targetDocument = iframe.contentWindow!.document
					} else {
						targetDocument = window.document
					}
					if (targetDocument.querySelector(selector)) {
						return resolve(targetDocument.querySelector(selector)!)
					} else {
						const observer: MutationObserver = new MutationObserver(_ => {
							if (targetDocument.querySelector(selector)) {
								observer.disconnect()

								return resolve(targetDocument.querySelector(selector)!)
							}
						})
						observer.observe(CONTAINER, {
							childList: true,
							subtree: true
						})
					}
				})
			} catch (err) {
			}
		}

		throw new Error(`Could not get element ${selector} after 5 tries`)
	}

	async function creditsApiCall(): Promise<number> {
		let resp = await fetch(creditsUrl + getApiKey(), {
			method: "GET",
			headers: API_HEADERS,
		})
		let credits = (await resp.json()).credits

		return credits
	}

	async function apiCall(url: string, body: any): Promise<any> {
		let resp = await fetch(url + getApiKey(), {
			method: "POST",
			headers: API_HEADERS,
			body: JSON.stringify(body)
		})

		return resp
	}

	async function imageCrawlPreAnalyzeApiCall(requestBody: SingleImageRequest):
			Promise<ImageCrawlPreAnalyzeResponse> {
		let resp = await apiCall(imageCrawlPreAnalyzeUrl, requestBody)
		let result = await resp.json()

		return result
	}

	async function imageCrawlApiCall(requestBody: ImageCrawlCaptchaRequest): Promise<number> {
		let resp = await apiCall(imageCrawlUrl, requestBody)
		let pixelsFromSliderOrigin = (await resp.json()).pixelsFromSliderOrigin

		return pixelsFromSliderOrigin
	}

	async function puzzleApiCall(puzzleB64: string, pieceB64: string): Promise<number> {
		let resp = await apiCall(puzzleUrl, {
			puzzleImageB64: puzzleB64,
			pieceImageB64: pieceB64
		})
		let slideXProportion = (await resp.json()).slideXProportion

		return slideXProportion
	}

	async function imageDragApiCall(puzzleB64: string, pieceB64: string): Promise<MultiPointResponse> {
		let resp = await apiCall(imageDragUrl, {
			puzzleImageB64: puzzleB64,
			pieceImageB64: pieceB64
		})
		let j = await resp.json()

		return j
	}

	function anySelectorInListPresent(selectors: Array<string>): boolean {
		for (const selector of selectors) {
			let ele = document.querySelector(selector)
			if (ele) {
				return true
			}
			let iframe = document.querySelector("iframe")
			if (iframe) {
				if (iframe.contentWindow) {
					ele = iframe.contentWindow.document.body.querySelector(selector)
					if (ele) {
						return true
					}
				}
			}
		}

		return false
	}

	async function identifyCaptcha(): Promise<CaptchaType> {
		for (let i = 0; i < 30; i++) {
			if (anySelectorInListPresent(IMAGE_CRAWL_UNIQUE_IDENTIFIERS)) {
				return CaptchaType.IMAGE_CRAWL
			} else if (anySelectorInListPresent(PUZZLE_UNIQUE_IDENTIFIERS)) {
				return CaptchaType.PUZZLE
			} else if (anySelectorInListPresent(IMAGE_DRAG_UNIQUE_IDENTIFIERS)) {
				return CaptchaType.IMAGE_DRAG
			} else {
				await new Promise(r => setTimeout(r, 1000));
			}
		}
		throw new Error("Could not identify CaptchaType")
	}

	async function getImageSource(selector: string, iframeSelector?: string): Promise<string> {
		let ele = await waitForElement(selector, iframeSelector)
		let src = ele.getAttribute("src")

		return src!
	}

	function getBase64StringFromDataURL(dataUrl: string): string {
		let img = dataUrl.replace('data:', '').replace(/^.+,/, '')

		return img
	}

	let trustedInputAvailable: boolean | null = null
	let mouseIsDown: boolean = false

	async function sendInputMessage(message: object): Promise<boolean> {
		try {
			let resp = await chrome.runtime.sendMessage(message)
			return resp !== undefined && resp !== null && resp.ok === true
		} catch (err) {
			return false
		}
	}

	function toDeviceLattice(v: number): number {
		const dpr = window.devicePixelRatio || 1
		return Math.round(v * dpr) / dpr
	}

	let cursor: { x: number | null, y: number | null } = { x: null, y: null }

	async function acquireTrustedInput(): Promise<boolean> {
		trustedInputAvailable = await sendInputMessage({ sadCaptchaInput: "acquire" })
		return trustedInputAvailable
	}

	async function releaseTrustedInput(): Promise<void> {
		if (trustedInputAvailable === true)
			await sendInputMessage({ sadCaptchaInput: "release" })
		trustedInputAvailable = null
		mouseIsDown = false
	}

	async function dispatchTrustedMouse(params: any): Promise<boolean> {
		const prevX = cursor.x
		const prevY = cursor.y
		if (typeof params.x === "number" && typeof params.y === "number") {
			cursor.x = params.x
			cursor.y = params.y
		}
		if (trustedInputAvailable === false)
			return false
		if (trustedInputAvailable === null)
			await acquireTrustedInput()
		if (trustedInputAvailable !== true)
			return false

		let msg: object
		let paceMs = 0
		if (INTERPOLATE_MOVES && params.type === "mouseMoved"
				&& prevX !== null && prevY !== null
				&& typeof params.x === "number") {
			const dist = Math.sqrt(Math.pow(params.x - prevX, 2)
				+ Math.pow(params.y - prevY, 2))
			const pts = Math.max(2, Math.min(12, Math.round(dist / 4)))
			let batch: Array<object> = []
			for (let i = 1; i <= pts; i++) {
				const f = i / pts
				batch.push(Object.assign({}, params, {
					x: toDeviceLattice(prevX + (params.x - prevX) * f),
					y: toDeviceLattice(prevY + (params.y - prevY) * f)
				}))
			}

			paceMs = pts * 2 + 4
			msg = { sadCaptchaInput: "mouseBatch", batch: batch }
		} else {
			msg = { sadCaptchaInput: "mouse", params: params }
		}

		const t0 = performance.now()
		let ok = await sendInputMessage(msg)
		if (!ok) {
			trustedInputAvailable = null
			await acquireTrustedInput()
			if (trustedInputAvailable === true)
				ok = await sendInputMessage(msg)
		}
		const spent = performance.now() - t0
		if (paceMs > spent)
			await new Promise(r => setTimeout(r, paceMs - spent))
		if (!ok) {
			trustedInputAvailable = false
		}
		return ok
	}

	function frameOffset(element: Element): Point {
		let offset: Point = { x: 0, y: 0 }
		try {
			let win: Window | null = element.ownerDocument.defaultView
			while (win !== null && win !== window) {
				let frame = win.frameElement
				if (frame === null)
					break
				let rect = frame.getBoundingClientRect()
				offset.x += rect.x + frame.clientLeft
				offset.y += rect.y + frame.clientTop
				win = win.parent
			}
		} catch (err) {
		}
		return offset
	}

	function viewportRect(element: Element): DOMRect {
		let rect = element.getBoundingClientRect()
		let offset = frameOffset(element)
		if (offset.x === 0 && offset.y === 0)
			return rect
		return new DOMRect(rect.x + offset.x, rect.y + offset.y, rect.width, rect.height)
	}

	function elementFromViewportPoint(x: number, y: number): Element | null {
		let element = document.elementFromPoint(x, y)
		let localX = x
		let localY = y
		while (element instanceof HTMLIFrameElement) {
			try {
				let rect = element.getBoundingClientRect()
				localX -= rect.x + element.clientLeft
				localY -= rect.y + element.clientTop
				let inner = element.contentWindow!.document.elementFromPoint(localX, localY)
				if (inner === null)
					break
				element = inner
			} catch (err) {
				break
			}
		}
		return element
	}

	function syntheticMouseEvent(type: string, x: number, y: number): void {
		let target = elementFromViewportPoint(x, y)
		if (target === null)
			target = CONTAINER
		target.dispatchEvent(
			new PointerEvent(type, {
				pointerType: "mouse",
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y,
				button: 0,
				buttons: mouseIsDown ? 1 : 0
			})
		)
	}

	async function mouseDown(x: number, y: number): Promise<void> {
		mouseIsDown = true
		let trusted = await dispatchTrustedMouse({
			type: "mousePressed",
			x: x,
			y: y,
			button: "left",
			buttons: 1,
			clickCount: 1,
			pointerType: "mouse"
		})
		if (!trusted) {
			syntheticMouseEvent("pointerdown", x, y)
			syntheticMouseEvent("mousedown", x, y)
		}
	}

	async function mouseUp(x: number, y: number): Promise<void> {
		let trusted = await dispatchTrustedMouse({
			type: "mouseReleased",
			x: x,
			y: y,
			button: "left",
			buttons: 1,
			clickCount: 1,
			pointerType: "mouse"
		})
		if (!trusted) {
			syntheticMouseEvent("pointerup", x, y)
			syntheticMouseEvent("mouseup", x, y)
		}
		mouseIsDown = false
	}

	async function mouseMove(x: number, y: number): Promise<void> {
		let trusted = await dispatchTrustedMouse({
			type: "mouseMoved",
			x: x,
			y: y,
			button: mouseIsDown ? "left" : "none",
			buttons: mouseIsDown ? 1 : 0,
			pointerType: "mouse"
		})
		if (!trusted) {
			syntheticMouseEvent("pointermove", x, y)
			syntheticMouseEvent("mousemove", x, y)
		}
	}

	async function mouseEnterPage(): Promise<void> {
		let width = window.innerWidth
		let centerX = window.innerWidth / 2
		let centerY = window.innerHeight / 2

		let entryPath = generateNaturalApproach(
			{x: 0, y: centerY * 0.9},
			{x: centerX, y: centerY},
			(Math.random() * 10) + 50
		)
		for (let i = 0; i < entryPath.length; i++) {
			let pt = entryPath[i]
			await mouseMove(pt.x, pt.y)
			await new Promise(r => setTimeout(r, 5 + Math.random() * 10));
		}
	}

	async function clickElement(selector: string): Promise<void> {
		let ele = document.querySelector(selector)!

		let center = getElementCenter(ele)

		await mouseMove(center.x, center.y)
		await new Promise(r => setTimeout(r, 30 + Math.random() * 50));
		await mouseDown(center.x, center.y)
		await new Promise(r => setTimeout(r, 40 + Math.random() * 60));
		await mouseUp(center.x, center.y)

		if (trustedInputAvailable !== true)
			syntheticMouseEvent("click", center.x, center.y)
	}

	function getElementCenter(element: Element): Point {
		let rect = viewportRect(element)
		let center = {
			x: rect.x + (rect.width / 2),
			y: rect.y + (rect.height / 2),
		}

		return center
	}

	function getElementWidth(element: Element): number {
		let rect = viewportRect(element)

		return rect.width
	}

	function computePuzzleSlideDistance(proportionX: number, puzzleImageEle: Element): number {
		let distance = viewportRect(puzzleImageEle).width * proportionX

		return distance
	}

	async function refreshImageCrawl() {
		await new Promise(r => setTimeout(r, 1000));
		let puzzleImageSrcOriginal = elementToDataUrl(
			document.querySelector(
				IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR) as HTMLCanvasElement
		)
		await clickElement(IMAGE_CRAWL_RESET_BUTTON)
		while (
			(
				elementToDataUrl(document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR) as HTMLCanvasElement))
					=== puzzleImageSrcOriginal
			) {
			await new Promise(r => setTimeout(r, 100));
			continue
		}
	}

	function generateNaturalApproach(
		start: {x: number, y: number},
		end: {x: number, y: number},
		steps: number
	): Array<{x: number, y: number}> {
		const control1 = {
			x: start.x + (end.x - start.x) * (0.2 + Math.random() * 0.2),
			y: start.y + (Math.random() * 15 - 5)
		};

		const control2 = {
			x: start.x + (end.x - start.x) * (0.6 + Math.random() * 0.2),
			y: end.y + (Math.random() * 10 - 5)
		};

		const points: Point[] = [];
		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			const x = Math.pow(1 - t, 3) * start.x +
					  3 * Math.pow(1 - t, 2) * t * control1.x +
					  3 * (1 - t) * Math.pow(t, 2) * control2.x +
					  Math.pow(t, 3) * end.x;

			const y = Math.pow(1 - t, 3) * start.y +
					  3 * Math.pow(1 - t, 2) * t * control1.y +
					  3 * (1 - t) * Math.pow(t, 2) * control2.y +
					  Math.pow(t, 3) * end.y;

			points.push({ x, y });
		}
		return points;
	}

	async function moveMouseTo(x: number, y: number): Promise<void> {
		await mouseMove(x, y)
	}

	async function mouseApproach(x: number, y: number): Promise<void> {
		const approachStartX = x - 80 - Math.random() * 40;
		const approachStartY = y + 40 + Math.random() * 30;
		const approachPoints = generateNaturalApproach(
			{ x: approachStartX, y: approachStartY },
			{ x: x, y: y },
			8 + Math.floor(Math.random() * 4)
		);

		for (const point of approachPoints) {
			await moveMouseTo(point.x, point.y);
			await new Promise(r => setTimeout(r, 15 + Math.random() * 25));
		}

		await moveMouseTo(
			x + (Math.random() * 1.5 - 0.75),
			y + (Math.random() * 1.5 - 0.75)
		);
	}

	function elementToDataUrl(ele: Element): string {
		if (ele instanceof HTMLCanvasElement) {
			return ele.toDataURL()
		} else if (ele instanceof HTMLImageElement) {
			return ele.src
		} else {
			throw new Error("cannot get data url from non-image or canvas element")
		}
	}

	async function solveImageCrawl(attempt: number = 1): Promise<void> {
		await refreshImageCrawl()

		await new Promise(r => setTimeout(r, 100));
		let puzzleImageEle = await waitForElement(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR) as HTMLCanvasElement
		let puzzleImg = getBase64StringFromDataURL(elementToDataUrl(puzzleImageEle))

		let imageCrawlInfo = await imageCrawlPreAnalyzeApiCall(
			{image_b64: puzzleImg}
		)

		if (imageCrawlInfo === undefined) {
			throw new Error("imageCrawlInfo was never initialized")
		}

		if (imageCrawlInfo.skipRecommended) {
			if (attempt >= SKIP_CAP) {
			} else {
				return await solveImageCrawl(attempt + 1)
			}
		} else {
		}

		const targetProp = imageCrawlInfo.slideXProportion
		if (typeof targetProp === "number" && targetProp >= 0.99 && attempt < SKIP_CAP) {
			return await solveImageCrawl(attempt + 1)
		}

		let pieceImageEle = await waitForElement(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR) as HTMLCanvasElement
		let pieceImg = getBase64StringFromDataURL(elementToDataUrl(pieceImageEle))
		let slideButtonEle = document.querySelector(IMAGE_CRAWL_BUTTON_SELECTOR) as Element

		const startX = getElementCenter(slideButtonEle).x
		const startY = getElementCenter(slideButtonEle).y
		let puzzleEle = document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR) as Element

		await mouseApproach(startX, startY)

		await new Promise(r => setTimeout(r, 50 * Math.random()));

		let trajectory = await getSlidePieceTrajectory(
			slideButtonEle,
			puzzleEle,
			imageCrawlInfo.slideXProportion
		)
		if (trajectory.length < MIN_TRAJECTORY_ROWS) {
			await mouseUp(getElementCenter(slideButtonEle).x, startY)
			if (attempt < SKIP_CAP)
				await solveImageCrawl(attempt + 1)
			return
		}

		let request = {
			piece_image_b64: pieceImg,
			puzzle_image_b64: puzzleImg,
			slide_piece_trajectory: trajectory
		}

		let solution = await imageCrawlApiCall(request)

		if (!solution) {
			await mouseUp(getElementCenter(slideButtonEle).x, startY)
			if (attempt < SKIP_CAP)
				await solveImageCrawl(attempt + 1)
			return
		}

		const maxPx = getElementWidth(puzzleEle) * 0.85
		const toU = (px: number): number => px / maxPx * 4 - 2
		const toPx = (u: number): number => (u + 2) / 4 * maxPx

		const aimU = toU(solution)
		const releaseY = getElementCenter(slideButtonEle).y

		const leg = async (fromPx: number, toPx_: number, step: number): Promise<number> => {
			const dist = toPx_ - fromPx
			const n = Math.max(1, Math.ceil(Math.abs(dist) / step))
			for (let i = 1; i <= n; i++) {
				await mouseMove(startX + fromPx + dist * (i / n),
					releaseY + (Math.random() * 1.6 - 0.8))
				await new Promise(r => setTimeout(r, GESTURE_PACE_MS))
			}
			return toPx_
		}

		const loU = toU(SWING_SAFE_PX)
		let sides: Array<number> = []
		for (let c = 0; c < GESTURE_PASSES; c++) {
			let a = GESTURE_AMP_U * (1 - c / GESTURE_PASSES)
			const room = (c % 2 === 0) ? (2 - aimU) : (aimU - loU)
			a = Math.max(0, Math.min(a, room))
			sides.push(aimU + (c % 2 === 0 ? a : -a))
		}

		let at = getElementCenter(slideButtonEle).x - startX
		for (const u of sides)
			at = await leg(at, toPx(u), 13)
		at = await leg(at, solution, 15)

		const releasePx = toPx(Math.round((toU(solution) + 0.02) * 1e4) / 1e4)
		await new Promise(r => setTimeout(r, between(PAUSE_BEFORE_NUDGE_MS)))
		await mouseMove(startX + releasePx, startY)
		await new Promise(r => setTimeout(r, between(PAUSE_BEFORE_RELEASE_MS)))

		await mouseUp(startX + releasePx, startY)
	}

	async function getSlidePieceTrajectory(
			slideButton: Element,
			puzzle: Element,
			maxProportionX: number
	): Promise<Array<TrajectoryElement>> {
		let sliderPieceContainer = document.querySelector(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR) as Element

		let slideBarWidth = getElementWidth(puzzle)

		let timesPieceDidNotMove = 0
		let slideButtonCenter = getElementCenter(slideButton)
		let puzzleImageBoundingBox = viewportRect(puzzle)
		let trajectory: Array<TrajectoryElement> = []
		let mouseStep = 3
		const limit = slideBarWidth * 0.85
		const haveMaxProp = typeof maxProportionX === "number" && isFinite(maxProportionX)
		await mouseDown(slideButtonCenter.x, slideButtonCenter.y)

		let blocks: Array<Array<number>> = []
		let planned = 0
		for (let base = 0; base < limit; base += SCATTER_BLOCK_PX) {
			let block: Array<number> = []
			for (let x = base; x < Math.min(base + SCATTER_BLOCK_PX, limit); x += mouseStep)
				block.push(Math.round(x))
			if (SCATTER_SWEEP)
				for (let i = block.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1))
					const t = block[i]; block[i] = block[j]; block[j] = t
				}
			planned += block.length
			blocks.push(block)
		}

		let stopPx: number | null = null
		let stopped = false

		await new Promise(r => setTimeout(r, PRESS_SETTLE_MS));
		for (const block of blocks) {
			for (const pixel of block) {
				await mouseMove(slideButtonCenter.x + pixel, slideButtonCenter.y)

				await new Promise(r => setTimeout(r, SAMPLE_SETTLE_MS));
				let trajectoryElement = getTrajectoryElement(
					pixel,
					puzzleImageBoundingBox,
					sliderPieceContainer
				)

				trajectory.push(trajectoryElement)

				if (haveMaxProp
						&& trajectoryElement.piece_center.proportionX >= maxProportionX) {
					if (stopPx === null) {
						stopPx = pixel
					} else if (pixel - stopPx >= OVERSHOOT_PX) {
						stopped = true
						break
					}
				}

				if (trajectory.length < 100 / mouseStep)
					continue
				if (pieceIsNotMoving(trajectory))
					timesPieceDidNotMove++
				else
					timesPieceDidNotMove = 0
				if (timesPieceDidNotMove >= 10 / mouseStep) {
					stopped = true
					break
				}
			}
			if (stopped)
				break

			const last = trajectory.length
				? trajectory[trajectory.length - 1].pixels_from_slider_origin : 0
			if (stopPx !== null && last - stopPx >= OVERSHOOT_PX)
				break
		}

		trajectory.sort((a, b) => a.pixels_from_slider_origin - b.pixels_from_slider_origin)

		return trajectory
	}

	function getTrajectoryElement(
		currentSliderPixel: number,
		largeImgBoundingBox: DOMRect,
		sliderPiece: Element
	): TrajectoryElement {
		let sliderPieceStyle = sliderPiece.getAttribute("style") as string
		let rotateAngle = rotateAngleFromStyle(sliderPieceStyle)
		let pieceCenter = getElementCenter(sliderPiece)
		let raw = xyToProportionalPoint(largeImgBoundingBox, pieceCenter)

		let pieceCenterProp = {
			proportionX: Math.round(raw.proportionX * 1e4) / 1e4,
			proportionY: Math.round(raw.proportionY * 1e4) / 1e4
		}
		let ele = {
			piece_center: pieceCenterProp,
			piece_rotation_angle: rotateAngle,
			pixels_from_slider_origin: currentSliderPixel
		}

		return ele
	}

	function rotateAngleFromStyle(style: string): number {
		let rotateRegex = /.*rotate\(|deg.*/gi
		let rotateAngle: number
		if (style.search(rotateRegex) === -1) {
			rotateAngle = 0
		} else {
			let rotateStr = style.replace(rotateRegex, "")
			rotateAngle = parseFloat(rotateStr)
		}

		return rotateAngle
	}

	function pieceIsNotMoving(trajetory: Array<TrajectoryElement>): Boolean {
		if (trajetory[trajetory.length - 1].piece_center.proportionX ==
		    trajetory[trajetory.length - 2].piece_center.proportionX) {
			return true
		} else {
			return false
		}
	}

	function xyToProportionalPoint(container: DOMRect, point: Point): ProportionalPoint {
		let xInContainer = point.x - container.x
		let yInContainer = point.y - container.y
		return {
			proportionX: xInContainer / container.width,
			proportionY: yInContainer / container.height,
		}
	}

	async function solvePuzzle(): Promise<void> {
		await new Promise(r => setTimeout(r, 3000));
		let sliderButton = document.querySelector(PUZZLE_BUTTON_SELECTOR) as Element
		let buttonCenter = getElementCenter(sliderButton)
		let preRequestSlidePixels = 10
		await mouseEnterPage()
		await new Promise(r => setTimeout(r, 133.7));
		await mouseMove(buttonCenter.x, buttonCenter.y)
		await new Promise(r => setTimeout(r, 133.7));
		await mouseDown(buttonCenter.x, buttonCenter.y)
		await new Promise(r => setTimeout(r, 133.7));
		for (let i = 1; i < preRequestSlidePixels; i++) {
			await mouseMove(
				buttonCenter.x + i,
				buttonCenter.y - Math.log(i) + Math.random() * 3
			)
			await new Promise(r => setTimeout(r, Math.random() * 5 + 10));
		}
		let puzzleSrc = await getImageSource(PUZZLE_PUZZLE_IMAGE_SELECTOR)
		let pieceSrc = await getImageSource(PUZZLE_PIECE_IMAGE_SELECTOR)

		let puzzleImg = getBase64StringFromDataURL(puzzleSrc)
		let pieceImg = getBase64StringFromDataURL(pieceSrc)

		let solution = await puzzleApiCall(puzzleImg, pieceImg)

		let puzzleImageEle = document.querySelector(PUZZLE_PUZZLE_IMAGE_SELECTOR) as Element
		let distance = computePuzzleSlideDistance(solution, puzzleImageEle)
		let currentX: number
		let currentY: number
		for (let i = 1; i < distance - preRequestSlidePixels; i += Math.random() * 5) {
			currentX = buttonCenter.x + i + preRequestSlidePixels
			currentY = buttonCenter.y - Math.log(i) + Math.random() * 3
			await mouseMove(currentX, currentY)
			await new Promise(r => setTimeout(r, Math.random() * 5 + 10));
		}
		await new Promise(r => setTimeout(r, 133.7));

		await mouseMove(buttonCenter.x + distance, buttonCenter.y)
		await new Promise(r => setTimeout(r, 133.7));
		await mouseUp(buttonCenter.x + distance, buttonCenter.y)
		await new Promise(r => setTimeout(r, 3000));
	}

	async function solveImageDrag(): Promise<void> {
		let pieceImageEle = await waitForElement(IMAGE_DRAG_PIECE_IMAGE_SELECTOR)
		let puzzleImageEle = await waitForElement(IMAGE_DRAG_PUZZLE_IMAGE_SELECTOR) as HTMLCanvasElement
		let pieceImageSrc = await getImageSource(IMAGE_DRAG_PIECE_IMAGE_SELECTOR)
		let puzzleImageSrc = elementToDataUrl(puzzleImageEle)
		let puzzleImg = getBase64StringFromDataURL(puzzleImageSrc)
		let pieceImg = getBase64StringFromDataURL(pieceImageSrc)

		let startPoint = getElementCenter(pieceImageEle)

		await mouseApproach(startPoint.x, startPoint.y)

		let apiResp = await imageDragApiCall(puzzleImg, pieceImg)
		let bbox = viewportRect(puzzleImageEle)
		let answerX = bbox.x + (apiResp.proportionalPoints[0].proportionX * bbox.width)
		let answerY = bbox.y + (apiResp.proportionalPoints[0].proportionY * bbox.height)

		await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
		await mouseDown(startPoint.x, startPoint.y)

		const dragPoints = generateNaturalApproach(startPoint, { x: answerX, y: answerY }, 20)
		for (const point of dragPoints) {
			await moveMouseTo(point.x, point.y)
			await new Promise(r => setTimeout(r, 10 + Math.random() * 20));
		}

		await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
		await mouseUp(answerX, answerY)

		await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
		await clickElement(IMAGE_DRAG_VERIFY_BUTTON_SELECTOR)

		await new Promise(r => setTimeout(r, 5000));
	}

	function captchaIsPresent(): boolean {
		for (let i = 0; i < CAPTCHA_PRESENCE_INDICATORS.length; i++) {
			if (document.querySelector(CAPTCHA_PRESENCE_INDICATORS[i])) {
				return true;
			}
		}

		return false
	}

	let isCurrentSolve: boolean = false
	async function solveCaptchaLoop() {
		if (!isCurrentSolve) {
			if (captchaIsPresent()){
			} else {
				await findFirstElementToAppear(CAPTCHA_PRESENCE_INDICATORS)
			}

			isCurrentSolve = true
			let captchaType: CaptchaType = CaptchaType.IMAGE_CRAWL
			try {
				captchaType = await identifyCaptcha()
			} catch (err) {
				isCurrentSolve = false
				await solveCaptchaLoop()
			}

			try {
				if (await creditsApiCall() <= 0) {
					alert("Out of SadCaptcha credits. Please boost your balance on sadcaptcha.com/dashboard.")
					return
				}
			} catch (e) {
			}

			await acquireTrustedInput()

			try {
				switch (captchaType) {
					case CaptchaType.PUZZLE:
						await solvePuzzle()
						break
					case CaptchaType.IMAGE_DRAG:
						await solveImageDrag()
						break
					case CaptchaType.IMAGE_CRAWL:
						await solveImageCrawl()
						break
				}
			} catch (err) {
			} finally {
				await releaseTrustedInput()
				isCurrentSolve = false
				await new Promise(r => setTimeout(r, 5000));
				await solveCaptchaLoop()
			}
		}
	}

	solveCaptchaLoop()
})();
