interface Request {
	apiKey: string
}

(function() {

	// Avoid multiple instances running: 
	if ((window as any).hasRun === true)
		return true;
	(window as any).hasRun = true;

	const CONTAINER: Element = document.documentElement || document.body

	// Api key is passed from extension via message
	chrome.runtime.onMessage.addListener(
		function(request: Request, _, sendResponse) {
			if (request.apiKey !== null) {
				console.log("Api key: " + request.apiKey)
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
	let puzzleUrl = "https://www.sadcaptcha.com/api/v1/puzzle?licenseKey="

	const API_HEADERS = new Headers({ "Content-Type": "application/json" })

	const IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR = ".DfwepB"
	const IMAGE_CRAWL_PIECE_IMAGE_SELECTOR = "#puzzleImgComponent"
	const IMAGE_CRAWL_BUTTON_SELECTOR = "#sliderContainer > div > div"
	const IMAGE_CRAWL_RESET_BUTTON = "button.CtJZAZ"
	const IMAGE_CRAWL_UNIQUE_IDENTIFIERS = ["#NEW_CAPTCHA", "#captchaMask"]

	const PUZZLE_BUTTON_SELECTOR = "aside[aria-modal=true] div[style=\"width: 40px; height: 40px; transform: translateX(0px);\"]"
	const PUZZLE_PUZZLE_IMAGE_SELECTOR = "aside[aria-modal=true] div[aria-hidden=true] > div > div > img[draggable=false]"
	const PUZZLE_PIECE_IMAGE_SELECTOR = "aside[aria-modal=true] div[aria-hidden=true] > div > div > img[draggable=true]"
	const PUZZLE_UNIQUE_IDENTIFIERS = ["aside[aria-modal=true]"]
	
	const CAPTCHA_PRESENCE_INDICATORS = [
		"aside[aria-modal=true] div[style=\"width: 40px; height: 40px; transform: translateX(0px);\"]", 
		"#NEW_CAPTCHA",
		"#captchaMask"
	]

	type Point = {
		x: number
		y: number
	}

	type ProportionalPoint = {
		proportionX: number
		proportionY: number
	}

	/*
		* A point along the trajectory of the arced slide captcha.
		* Contains data about the position and rotation of the sliding piece
	*/
	type TrajectoryElement = {
		pixels_from_slider_origin: number
		piece_rotation_angle: number
		piece_center: ProportionalPoint
	}

	/*
		* This object contains data about the arced slide captcha including 
		* images, the trajectory of the slider, and the position of the 
		* slider button.
	*/
	type ImageCrawlCaptchaRequest = {
		puzzle_image_b64: string
		piece_image_b64: string
		slide_piece_trajectory: Array<TrajectoryElement>
	}

	enum CaptchaType {
		PUZZLE,
		IMAGE_CRAWL,
		SEMANTIC_SHAPES
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
						if (node instanceof HTMLIFrameElement) {
							let iframe = <HTMLIFrameElement>node 
							setTimeout(() => {
								let iframeElement = iframe.contentWindow.document.body.querySelector(selector)
								if (iframeElement) {
									console.debug(`element matched ${selector} in iframe`)
									observer.disconnect()
									console.dir(iframeElement)
									return  resolve(iframeElement)
								} 
							}, 3000)
						} else if (node instanceof Element) {
							let element = <Element>node
							if (element.querySelector(selector)) {
								console.debug(`element matched ${selector}`)
								observer.disconnect()
								console.dir(element)
								return resolve(element)
							}
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
		return new Promise(resolve => {
			let targetDocument: Document;
			if (iframeSelector !== undefined) {
				let iframe = document.querySelector(iframeSelector) as HTMLIFrameElement
				targetDocument = iframe.contentWindow.document
			} else {
				targetDocument = window.document
			}
			if (targetDocument.querySelector(selector)) {
				console.log("Selector found: " + selector)
				return resolve(targetDocument.querySelector(selector)!)
			} else {
				const observer: MutationObserver = new MutationObserver(_ => {
					if (targetDocument.querySelector(selector)) {
						observer.disconnect()
						console.log("Selector found by mutation observer: " + selector)
						return resolve(targetDocument.querySelector(selector)!)
					}
				})
				observer.observe(CONTAINER, {
					childList: true,
					subtree: true
				})
			}
		})
	}

	async function creditsApiCall(): Promise<number> {
		console.log("making api call")
		let resp = await fetch(creditsUrl + getApiKey(), {
			method: "GET",
			headers: API_HEADERS,
		})
		let credits = (await resp.json()).credits
		console.log("api credits = " + credits)
		return credits
	}

	async function apiCall(url: string, body: any): Promise<any> {
		console.log("making api call")
		let resp = await fetch(url + getApiKey(), {
			method: "POST",
			headers: API_HEADERS,
			body: JSON.stringify(body)
		})
		console.log("got api response:")
		console.log(resp)
		return resp
	}

	async function imageCrawlApiCall(requestBody: ImageCrawlCaptchaRequest): Promise<number> {
		let resp = await apiCall(imageCrawlUrl, requestBody)
		let pixelsFromSliderOrigin = (await resp.json()).pixelsFromSliderOrigin
		console.log("pixels from slider origin = " + pixelsFromSliderOrigin)
		return pixelsFromSliderOrigin
	}

	async function puzzleApiCall(puzzleB64: string, pieceB64: string): Promise<number> {
		let resp = await apiCall(puzzleUrl, {
			puzzleImageB64: puzzleB64,
			pieceImageB64: pieceB64
		})
		let slideXProportion = (await resp.json()).slideXProportion
		console.log("slideXProportion = " + slideXProportion)
		return slideXProportion
	}

	function anySelectorInListPresent(selectors: Array<string>): boolean {
		for (const selector of selectors) {
			let ele = document.querySelector(selector)
			if (ele) {
				console.log(`selector ${selector} is present`)
				return true
			}
			let iframe = document.querySelector("iframe")
			if (iframe) {
				console.log("checking for selector in iframe")
				ele = iframe.contentWindow.document.body.querySelector(selector)
				if (ele) {
					console.log("Selector is present in iframe: " + selector)
					return true
				}
			}
		}
		console.log(`no selector in list is present`)
		return false
	}

	async function identifyCaptcha(): Promise<CaptchaType> {
		for (let i = 0; i < 30; i++) {
			if (anySelectorInListPresent(IMAGE_CRAWL_UNIQUE_IDENTIFIERS)) {
				console.log("image crawl detected")
				return CaptchaType.IMAGE_CRAWL
			} else if (anySelectorInListPresent(PUZZLE_UNIQUE_IDENTIFIERS)) {
				console.log("puzzle detected")
				return CaptchaType.PUZZLE
			} else {
				await new Promise(r => setTimeout(r, 1000));
			}
		}
		throw new Error("Could not identify CaptchaType")
	}

	async function getImageSource(selector: string, iframeSelector?: string): Promise<string> {
		let ele = await waitForElement(selector, iframeSelector)
		let src = ele.getAttribute("src")
		console.log("src = " + selector)
		return src
	}

	function getBase64StringFromDataURL(dataUrl: string): string {
		let img = dataUrl.replace('data:', '').replace(/^.+,/, '')
		console.log("got b64 string from data URL")
		return img
	}

	function mouseUp(x: number, y: number): void {
		CONTAINER.dispatchEvent(
			new MouseEvent("mouseup", {
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("mouse up at " + x + ", " + y)
	}

	function mouseOver(x: number, y: number): void {
		let underMouse = document.elementFromPoint(x, y)
		underMouse.dispatchEvent(
			new MouseEvent("mouseover", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("mouse over at " + x + ", " + y)
	}

	function mouseOut(x: number, y: number): void {
		let underMouse = document.elementFromPoint(x, y)
		underMouse.dispatchEvent(
			new MouseEvent("mouseout", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("mouse over at " + x + ", " + y)
	}

	function mouseDown(x: number, y: number): void {
		let underMouse = document.elementFromPoint(x, y)
		underMouse.dispatchEvent(
			new MouseEvent("mousedown", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("mouse down at " + x + ", " + y)
	} 

	function mouseEnterPage(): void {
		let width = window.innerWidth
		let centerX = window.innerWidth / 2
		let centerY = window.innerHeight / 2
		CONTAINER.dispatchEvent(
			new MouseEvent("mouseenter", {
				bubbles: true,
				view: window,
				clientX: width,
				clientY: centerY
			})
		)
		CONTAINER.dispatchEvent(
			new MouseEvent("mouseover", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: width,
				clientY: centerY
			})
		)
		for (let i = 1; i < centerX; i++) {
			try {
				mouseMove(width - i, centerY)
				mouseOver(width - i, centerY)
			} catch (err) {
				console.log("error moving mouse into page: ")
				console.dir(err)
			}
		}
	}

	function randomMouseMovement() {
		//let randomX = aroundX + Math.round((Math.random() * 20) - 10)
		//let randomY = aroundY + Math.round((Math.random() * 20) - 10)
		let randomX = Math.round(window.innerWidth * Math.random())
		let randomY = Math.round(window.innerHeight * Math.random())
		mouseMove(randomX, randomX)
		mouseOver(randomX, randomY)
		mouseOut(randomX, randomY)
	}

	function clickElement(selector: string) {
		let ele = document.querySelector(selector)
		let rect = ele.getBoundingClientRect()
		let x = rect.x
		let y = rect.y
		mouseMove(x ,y)
		mouseOver(x, y)
		ele.dispatchEvent(
			new PointerEvent("click", {
				pointerType: "mouse",
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
	}

	function mouseMove(x: number, y: number, ele?: Element): void {
		let c: Element
		if (ele === undefined) {
			c = CONTAINER
		} else {
			c = ele
		}
		c.dispatchEvent(
			new PointerEvent("mousemove", {
				pointerType: "mouse",
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("moved mouse to " + x + ", " + y)
	}

	function getElementCenter(element: Element): Point {
		let rect = element.getBoundingClientRect()
		let center = {
			x: rect.x + (rect.width / 2),
			y: rect.y + (rect.height / 2),
		}
		console.log("element center: ")
		console.dir(center)
		return center
	}

	function getElementWidth(element: Element): number {
		let rect = element.getBoundingClientRect()
		console.log("element width: " + rect.width)
		return rect.width
	}

	function computePuzzleSlideDistance(proportionX: number, puzzleImageEle: Element): number {
		let distance = puzzleImageEle.getBoundingClientRect().width * proportionX
		console.log("puzzle slide distance = " + distance)
		return distance
	}

	async function refreshImageCrawl() {
		let puzzleImageSrcOriginal = await getImageSource(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR)
		clickElement(IMAGE_CRAWL_RESET_BUTTON)
		while (await getImageSource(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR) === puzzleImageSrcOriginal) {
			console.log("waiting for refresh...")
			await new Promise(r => setTimeout(r, 100));
			continue
		}
		console.log("refresh complete")
	}

	async function solveImageCrawl(): Promise<void> {
		mouseEnterPage()
		await refreshImageCrawl()
		await new Promise(r => setTimeout(r, 500));
		let puzzleImageSrc = await getImageSource(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR)
		let pieceImageSrc = await getImageSource(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR)
		let puzzleImg = getBase64StringFromDataURL(puzzleImageSrc)
		let pieceImg = getBase64StringFromDataURL(pieceImageSrc)
		let slideButtonEle = document.querySelector(IMAGE_CRAWL_BUTTON_SELECTOR)
		const startX = getElementCenter(slideButtonEle).x
		const startY = getElementCenter(slideButtonEle).y
		let puzzleEle = document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR)

		let trajectory = await getSlidePieceTrajectory(slideButtonEle, puzzleEle)
		let solution = await imageCrawlApiCall({
			piece_image_b64: pieceImg,
			puzzle_image_b64: puzzleImg,
			slide_piece_trajectory: trajectory
		})
		let currentX = getElementCenter(slideButtonEle).x
		let currentY = getElementCenter(slideButtonEle).y
		let solutionDistanceBackwards = currentX - startX - solution
		await new Promise(r => setTimeout(r, 100));
		for (
				let pixel = 0;
				pixel < solutionDistanceBackwards;
				pixel += 1
		) {
			let nextX = currentX - pixel
			let nextY = currentY - Math.log(pixel + 1)
			mouseMove(nextX, nextY)
			mouseOver(nextX, nextY)
			let pauseTime = (200 / (pixel + 1)) + (Math.random() * 5)
			await new Promise(r => setTimeout(r, pauseTime));
		}
		await new Promise(r => setTimeout(r, 300));
		mouseMove(startX + solution, startY)
		mouseUp(startX + solution, startY)
		await new Promise(r => setTimeout(r, 3000));
	}

	async function getSlidePieceTrajectory(slideButton: Element, puzzle: Element): Promise<Array<TrajectoryElement>> {
		let sliderPieceContainer = document.querySelector(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR)
		console.log("got slider piece container")
		let slideBarWidth = getElementWidth(puzzle)
		console.log("slide bar width: " + slideBarWidth)
		let timesPieceDidNotMove = 0
		let slideButtonCenter = getElementCenter(slideButton)
		let puzzleImageBoundingBox = puzzle.getBoundingClientRect()
		let trajectory: Array<TrajectoryElement> = []
		let mouseStep = 3
		mouseMove(slideButtonCenter.x, slideButtonCenter.y)
		mouseDown(slideButtonCenter.x, slideButtonCenter.y)
		slideButton.dispatchEvent(
			new MouseEvent("mousedown", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: slideButtonCenter.x, 
				clientY: slideButtonCenter.y
			})
		)
		for (let pixel = 0; pixel < slideBarWidth * 0.85; pixel += mouseStep) {
			let nextX = slideButtonCenter.x + pixel
			let nextY = slideButtonCenter.y - Math.log(pixel + 1)
			// Speed up as we go
			let pauseTime = (200 / (pixel + 1)) + (Math.random() * 5)
			await new Promise(r => setTimeout(r, pauseTime));
			//moveMouseTo(slideButtonCenter.x + pixel, slideButtonCenter.y - pixel)
			slideButton.dispatchEvent(
				new MouseEvent("mousemove", {
					cancelable: true,
					bubbles: true,
					view: window,
					clientX: nextX, 
					clientY: nextY
				})
			)
			await new Promise(r => setTimeout(r, 10));
			let trajectoryElement = getTrajectoryElement(
				pixel,
				puzzleImageBoundingBox,
				sliderPieceContainer
			)
			trajectory.push(trajectoryElement)
			if (trajectory.length < 100 / mouseStep)
				continue
			if (pieceIsNotMoving(trajectory))
				timesPieceDidNotMove++
			else
				timesPieceDidNotMove = 0
			if (timesPieceDidNotMove >= 10 / mouseStep)
				break
			console.log("trajectory element:")
			console.dir(trajectoryElement)
		}
		return trajectory
	}

	function getTrajectoryElement(
		currentSliderPixel: number,
		largeImgBoundingBox: DOMRect,
		sliderPiece: Element
	): TrajectoryElement {
		let sliderPieceStyle = sliderPiece.getAttribute("style")
		let rotateAngle = rotateAngleFromStyle(sliderPieceStyle)
		let pieceCenter = getElementCenter(sliderPiece)
		let pieceCenterProp = xyToProportionalPoint(largeImgBoundingBox, pieceCenter) // This returns undefined
		let ele = {
			piece_center: pieceCenterProp,
			piece_rotation_angle: rotateAngle,
			pixels_from_slider_origin: currentSliderPixel
		}
		console.dir(ele)
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
		console.log("rotate angle: " + rotateAngle)
		return rotateAngle
	}

	function pieceIsNotMoving(trajetory: Array<TrajectoryElement>): Boolean {
		console.dir(trajetory)
		if (trajetory[trajetory.length - 1].piece_center.proportionX == 
		    trajetory[trajetory.length - 2].piece_center.proportionX) {
			console.log("piece is not moving")
			return true
		} else {
			console.log("piece is moving")
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
		let sliderButton = document.querySelector(PUZZLE_BUTTON_SELECTOR)
		let buttonCenter = getElementCenter(sliderButton)
		let preRequestSlidePixels = 10
		mouseEnterPage()
		await new Promise(r => setTimeout(r, 133.7));
		mouseMove(buttonCenter.x, buttonCenter.y)
		mouseOver(buttonCenter.x, buttonCenter.y)
		await new Promise(r => setTimeout(r, 133.7));
		mouseDown(buttonCenter.x, buttonCenter.y)
		await new Promise(r => setTimeout(r, 133.7));
		for (let i = 1; i < preRequestSlidePixels; i++) {
			mouseMove(
				buttonCenter.x + i, 
				buttonCenter.y - Math.log(i) + Math.random() * 3
			)
			await new Promise(r => setTimeout(r, Math.random() * 5 + 10));
		}
		let puzzleSrc = await getImageSource(PUZZLE_PUZZLE_IMAGE_SELECTOR)
		let pieceSrc = await getImageSource(PUZZLE_PIECE_IMAGE_SELECTOR)
		console.log("got image sources")
		let puzzleImg = getBase64StringFromDataURL(puzzleSrc)
		let pieceImg = getBase64StringFromDataURL(pieceSrc)
		console.log("converted image sources to b64 string")
		let solution = await puzzleApiCall(puzzleImg, pieceImg)
		console.log("got API result: " + solution)
		let puzzleImageEle = document.querySelector(PUZZLE_PUZZLE_IMAGE_SELECTOR)
		let distance = computePuzzleSlideDistance(solution, puzzleImageEle)
		let currentX: number
		let currentY: number
		for (let i = 1; i < distance - preRequestSlidePixels; i += Math.random() * 5) {
			currentX = buttonCenter.x + i + preRequestSlidePixels
			currentY = buttonCenter.y - Math.log(i) + Math.random() * 3
			mouseMove(currentX, currentY)
			mouseOver(currentX, currentY)
			await new Promise(r => setTimeout(r, Math.random() * 5 + 10));
		}
		await new Promise(r => setTimeout(r, 133.7));
		mouseOver(buttonCenter.x + distance, buttonCenter.x - distance)
		await new Promise(r => setTimeout(r, 133.7));
		mouseUp(buttonCenter.x + distance, buttonCenter.x - distance)
		await new Promise(r => setTimeout(r, 3000));
	}

	function captchaIsPresent(): boolean {
		for (let i = 0; i < CAPTCHA_PRESENCE_INDICATORS.length; i++) {
			if (document.querySelector(CAPTCHA_PRESENCE_INDICATORS[i])) {
				console.log("captcha present based on selector: " + CAPTCHA_PRESENCE_INDICATORS[i])
				return true;
			}
		}
		console.log("captcha not present")
		return false
	}


	let isCurrentSolve: boolean = false
	async function solveCaptchaLoop() {
		if (!isCurrentSolve) {
			
			if (captchaIsPresent()){
				console.log("captcha detected by css selector")
			} else {
				console.log("waiting for captcha")
				await findFirstElementToAppear(CAPTCHA_PRESENCE_INDICATORS)
				console.log("captcha detected by mutation observer")
			}

			isCurrentSolve = true
			let captchaType: CaptchaType
			try {
				captchaType = await identifyCaptcha()
			} catch (err) {
				console.log("could not detect captcha type. restarting captcha loop")
				isCurrentSolve = false
				await solveCaptchaLoop()
			}

			try {
				if (await creditsApiCall() <= 0) {
					console.log("out of credits")
					alert("Out of SadCaptcha credits. Please boost your balance on sadcaptcha.com/dashboard.")
					return
				}
			} catch (e) {
				console.log("error making check credits api call")
				console.error(e)
				console.log("proceeding to attempt solution anyways")
			}
			
			try {
				switch (captchaType) {
					case CaptchaType.PUZZLE:
						await solvePuzzle()
						break
					case CaptchaType.IMAGE_CRAWL:
						await solveImageCrawl()
						break
				}
			} catch (err) {
				console.log("error solving captcha")
				console.error(err)
				console.log("restarting captcha loop")
			} finally {
				isCurrentSolve = false
				await new Promise(r => setTimeout(r, 5000));
				await solveCaptchaLoop()
			}
		}
	}

	solveCaptchaLoop()

})();
