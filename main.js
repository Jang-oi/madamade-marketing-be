import expressApp from './App.js';
import fs from "fs";

import {createRequire} from 'module';
import {defaultPath, notepadOpen} from "./src/utils/common.js";
const require = createRequire(import.meta.url);
const {app, Tray, Menu, BrowserWindow} = require('electron/main');

let mainWindow;
let tray

const browserOption = {
    width          : 1720,
    height         : 860,
    minWidth       : 1440,
    minHeight      : 600,
    webPreferences : {
        nodeIntegration: true,
    },
    resizable      : true,
    autoHideMenuBar: true,
    show           : false,
    y              : 0,
    x              : 0,
    title : 'S'
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
    app.exit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });
}

const createWindow = async () => {
    mainWindow = new BrowserWindow(browserOption);
    expressApp.listen(3001);

    await mainWindow.loadURL("http://localhost:3001/license");
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

const createTray = () => {
    tray = new Tray(`${defaultPath}/src/assets/images/Autumn.jpg`);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '도움말',
            click: async () => {
                const manualWindow = new BrowserWindow(browserOption);
                await manualWindow.loadURL('https://thoracic-spring-58d.notion.site/29bb6d7c62584007ad8fa895f5e89973?pvs=4');
                manualWindow.show();
            },
        },
        {
            label: '크롬경로입력',
            click: () => {
                const filePath = `${defaultPath}/chrome.txt`;
                fs.access(filePath, fs.constants.F_OK, (err) => {
                    if (err) {
                        fs.writeFile(filePath, '', () => {
                            notepadOpen(filePath);
                        });
                    } else {
                        notepadOpen(filePath);
                    }
                });
            },
        },
        {
            label: '재시작',
            click: () => {
                app.exit();
                app.relaunch();
            },
        },
        {
            label: '종료',
            click: () => {
                app.isQuiting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Seller Supporter');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
    });

    mainWindow.on('close', function (event) {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

app.on('ready', () => {
    createWindow();
    createTray();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});