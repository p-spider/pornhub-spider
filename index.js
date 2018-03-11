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
	let ele = $(".thumb-block .thumb > a");

	let u = [];
	ele.each(function (index, elem) {
		let href = elem.href;
		u.push(href)
	});

	return u;
}

function parseVideoPage() {
	return {
		name: ((window.html5player.video_title + '.mp4').replace(/ /g, '_')).replace(/\?/g, ''),
		src: window.html5player.url_high,
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
			headless: false,
			devtools: false,
		};
		this.browser = null;
	}

	async init() {
		this.browser = await puppeteer.launch(this.conf);
	}


	async openListPage(url) {
		let page = await this.browser.newPage();
		await page.goto(url);
		await page.waitForSelector('.thumb-block .thumb > a', {timeout: 3000 * 90});
		let urlList = await page.evaluate(parseListPage);
		page.close();
		return urlList;
	}


	async openVideoPage(url) {
		let page = await this.browser.newPage();
		await page.goto(url);
		let urlList = await page.evaluate(parseVideoPage);
		page.close();
		return urlList;
	}


	async batchDownload(taskList) {
		return Promise.map(taskList, (task) => {
			return download(task.name, task.src)
		}, {concurrency: taskList.length})
	}


	async run() {
		await this.init();
		for (let i = 1; i < 1000; i++) {
			let url = `http://www.xvideos.com/new/${i}`;
			let urlList = await this.openListPage(url);

			let taskList = [];
			for (let _url of urlList) {
				let {name, src} = await this.openVideoPage(_url);
				logger.info(`find video name:${name}`);
				taskList.push({name, src});
			}

			for (let task of taskList) {
				logger.info(`start batch download videos:${task.name}`);
			}
			taskList.length = 1;
			await this.batchDownload(taskList);
		}
	}
}

let spider = new Spider();
spider.run();
