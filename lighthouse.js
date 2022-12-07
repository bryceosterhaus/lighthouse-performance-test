const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');

const desktopConfig = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');
const mobileConfig = require('lighthouse/lighthouse-core/config/lr-mobile-config.js');

const database = require('./database');

const URL = 'http://localhost:8080';

const dateObj = new Date();

const dateString = dateObj.toString();

(async () => {
	console.log('Launching Chrome:');

	const chrome = await chromeLauncher.launch({
		chromeFlags: ['--headless'],
	});

	const remoteInterface = await CDP({port: chrome.port});

	console.log('Waiting for page to load...');

	const {Page, Runtime} = remoteInterface;

	await Page.enable();
	await Runtime.enable();

	Page.navigate({url: URL});

	await Page.loadEventFired();

	const flags = {
		logLevel: 'info',
		output: 'html',
		onlyCategories: ['performance'],
		port: chrome.port,
	};

	console.log('Running Lighthouse Audits:');

	const desktopRunner = await lighthouse(URL, flags, desktopConfig);
	const mobileRunner = await lighthouse(URL, flags, mobileConfig);

	const desktopReportHtml = desktopRunner.report;
	const mobileReportHtml = mobileRunner.report;

	fs.mkdirSync(`./reports/${dateString}`, {recursive: true});

	fs.writeFileSync(
		`./reports/${dateString}/desktop-report.html`,
		desktopReportHtml
	);
	fs.writeFileSync(
		`./reports/${dateString}/mobile-report.html`,
		mobileReportHtml
	);

	const desktopScore = desktopRunner.lhr.categories.performance.score * 100;
	const mobileScore = mobileRunner.lhr.categories.performance.score * 100;

	console.log(mobileRunner.lhr.categories);

	console.log('Results:');

	console.table({
		desktop: desktopScore,
		mobile: mobileScore,
	});

	const data = database.read();

	data.lighthouse.latest = {
		desktop: desktopScore,
		mobile: mobileScore,
	};

	data.lighthouse.raw[dateString] = {
		desktop: desktopScore,
		mobile: mobileScore,
	};

	database.write();

	if (remoteInterface) {
		await remoteInterface.close();
	}

	await chrome.kill();
})();
