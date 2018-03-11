/***
 * Puppeteer
 */

const fs = require('fs');
const log4js = require('log4js');
const request = require('request');
const Promise = require('bluebird');
const puppeteer = require('puppeteer');

const logger = log4js.getLogger();
logger.level = 'info';

function parseListPage() {
	let ele = document.querySelectorAll(".videoBox .wrap a.img");

	let u = [];
	ele.forEach(function (elem, index) {
		let href = elem.href;
		u.push(href)
	});

	return u;
}

function parseVideoPage() {
	return {
		name: ((window.WIDGET_SHARE.shareTitle + '.mp4').replace(/ /g, '_')).replace(/\?/g, ''),
		src: window.player_quality_720p
	};
}

function download(fileName, filePath) {
	let reqConfig = {
		url: filePath,
		method: 'get',
		header: this.header
	};
	let stream = fs.createWriteStream('./video/' + fileName);
	// stream.on('finish', () => {
	// 	logger.info(`${fileName} is done`);
	// });
	// stream.on('pipe', (src) => {
	// 	logger.info(`${src} is go on`);
	// });
	return new Promise((resolve, reject) => {
		request(reqConfig)
			.on('error', (err) => {
				logger.error(`wget file err: ${err}`);
				reject(err)
			})
			.pipe(stream)
			.on('close', () => {
				resolve(void(0))
			});
	})
}


class Spider {
	constructor() {
		this.conf = {
			headless: true,
			devtools: false,
		};
		this.browser = null;
	}

	async init() {
		this.browser = await puppeteer.launch(this.conf);
	}


	async openListPage(url) {
		try {
			let page = await this.browser.newPage();
			await page.goto(url);
			await page.waitForSelector('.videoBox .wrap a.img', {timeout: 3000 * 90});
			let urlList = await page.evaluate(parseListPage);
			page.close();
			return urlList;
		} catch (err) {
			logger.error(err);
			return await this.openListPage(url)
		}
	}


	async openVideoPage(url) {
		try {
			let page = await this.browser.newPage();
			await page.goto(url);
			let urlList = await page.evaluate(parseVideoPage);
			page.close();
			return urlList;
		} catch (err) {
			logger.error(err);
			return await this.openVideoPage(url)
		}
	}


	async batchDownload(taskList) {
		return Promise.map(taskList, (task) => {
			return download(task.name, task.src)
		}, {concurrency: taskList.length})
	}


	async run() {
		await this.init();
		for (let i = 1; i < 1000; i++) {
			let url = `https://www.pornhub.com/video?page=${i}`;
			let urlList = await this.openListPage(url);


			let taskList = [];
			for (let _url of urlList) {
				let {name, src} = await this.openVideoPage(_url);
				logger.info(`find video name:${name}`);
				if (src) {
					taskList.push({name, src});
				}
			}

			for (let task of taskList) {
				logger.info(`start batch download videos:${task.name} | ${task.src}`);
			}
			await this.batchDownload(taskList);
		}
	}
}

let spider = new Spider();
spider.run();
