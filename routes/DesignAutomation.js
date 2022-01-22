const _path = require('path');
const _fs = require('fs');
const _url = require('url');
const express = require('express');
const http = require('https');
const formdata = require('form-data');
const bodyParser = require('body-parser');
const multer = require('multer');
const router = express.Router();
const {
    getClient,
    getInternalToken
} = require('./common/oauth');
const config = require('../config');
const dav3 = require('autodesk.forge.designautomation');
const ForgeAPI = require('forge-apis');

router.use(bodyParser.json());

router.use(async (req, res, next) => {
    req.oauth_client = await getClient(/*config.scopes.internal*/);
    req.oauth_token = req.oauth_client.getCredentials();
    next();
});

let dav3Instance = null;

class Utils {

    static async Instance () {
        if (dav3Instance === null) {
            dav3Instance = new dav3.AutodeskForgeDesignAutomationClient(config.client);
            let FetchRefresh = async (data) => {
                let client = await getClient();
                let credentials = client.getCredentials();
                return (credentials);
            };
            dav3Instance.authManager.authentications['2-legged'].fetchToken = FetchRefresh;
            dav3Instance.authManager.authentications['2-legged'].refreshToken = FetchRefresh;
        }
        return (dav3Instance);
    }

    static get LocalBundlesFolder () {
        return (_path.resolve(_path.join(__dirname, '../', 'public/bundles')));
    }

    static get NickName () {
        return (config.credentials.client_id);
    }

    static get Alias () {
        return ('dev');
    }

    static async findFiles (dir, filter) {
        return (new Promise((fulfill, reject) => {
            _fs.readdir(dir, (err, files) => {
                if (err)
                    return (reject(err));
                if (filter !== undefined && typeof filter === 'string')
                    files = files.filter((file) => {
                        return (_path.extname(file) === filter);
                    });
                else if (filter !== undefined && typeof filter === 'object')
                    files = files.filter((file) => {
                        return (filter.test(file));
                    });
                fulfill(files);
            });
        }));
    }

    static async dav3API (oauth2) {
        let apiClient = await Utils.Instance();
        return (new dav3.AutodeskForgeDesignAutomationApi(apiClient));
    }

    static EngineAttributes (engine) {
        if (engine.includes('3dsMax'))
            return ({
                commandLine: '$(engine.path)\\3dsmaxbatch.exe -sceneFile $(args[inputFile].path) $(settings[script].path)',
                extension: 'max',
                script: "da = dotNetClass(\'Autodesk.Forge.Sample.DesignAutomation.Max.RuntimeExecute\')\nda.ModifyWindowWidthHeight()\n"
            });
        if (engine.includes('AutoCAD'))
            return ({
                commandLine: '$(engine.path)\\accoreconsole.exe /i $(args[inputFile].path) /al $(appbundles[{0}].path) /s $(settings[script].path)',
                extension: 'dwg',
                script: "UpdateParam\n"
            });
        if (engine.includes('Inventor'))
            return ({
                commandLine: '$(engine.path)\\InventorCoreConsole.exe /i $(args[inputFile].path) /al $(appbundles[{0}].path)',
                extension: 'ipt',
                script: ''
            });
        if (engine.includes('Revit'))
            return ({
                commandLine: '$(engine.path)\\revitcoreconsole.exe /i $(args[inputFile].path) /al $(appbundles[{0}].path)',
                extension: 'rvt',
                script: ''
            });

        throw new Error('Invalid engine');
    }

    static FormDataLength (form) {
        return (new Promise((fulfill, reject) => {
            form.getLength((err, length) => {
                if (err)
                    return (reject(err));
                fulfill(length);
            });
        }));
    }

    static uploadFormDataWithFile (filepath, endpoint, params = null) {
        return (new Promise(async (fulfill, reject) => {
            const fileStream = _fs.createReadStream(filepath);

            const form = new formdata();
            if (params) {
                const keys = Object.keys(params);
                for (let i = 0; i < keys.length; i++)
                    form.append(keys[i], params[keys[i]]);
            }
            form.append('file', fileStream);

            let headers = form.getHeaders();
            headers['Cache-Control'] = 'no-cache';
            headers['Content-Length'] = await Utils.FormDataLength(form);

            const urlinfo = _url.parse(endpoint);
            const postReq = http.request({
                host: urlinfo.host,
                port: (urlinfo.port || (urlinfo.protocol === 'https:' ? 443 : 80)),
                path: urlinfo.pathname,
                method: 'POST',
                headers: headers
            },
                response => {
                    fulfill(response.statusCode);
                },
                err => {
                    reject(err);
                }
            );

            form.pipe(postReq);
        }));
    }
}

router.get('/appbundles', async /*GetLocalBundles*/ (req, res) => {
    let bundles = await Utils.findFiles(Utils.LocalBundlesFolder, '.zip');
    bundles = bundles.map((fn) => _path.basename(fn, '.zip'));
    res.json(bundles);
});

router.get('/forge/designautomation/engines', async /*GetAvailableEngines*/ (req, res) => {
    let that = this;
    try {
        const api = await Utils.dav3API(req.oauth_token);
        let engines = await api.getEngines();
        res.json(engines.data.sort()); 
    } catch (ex) {
        console.error(ex);
        res.json([]);
    }

});

router.post('/forge/designautomation/appbundles', async /*CreateAppBundle*/ (req, res) => {
    const appBundleSpecs = req.body;

    const zipFileName = appBundleSpecs.zipFileName;
    const engineName = appBundleSpecs.engine;

    const appBundleName = zipFileName + 'AppBundle';

    const packageZipPath = _path.join(Utils.LocalBundlesFolder, zipFileName + '.zip');

    const api = await Utils.dav3API(req.oauth_token);
    let appBundles = null;
    try {
        appBundles = await api.getAppBundles();
    } catch (ex) {
        console.error(ex);
        return (res.status(500).json({
            diagnostic: 'Failed to get the Bundle list'
        }));
    }

    let newAppVersion = null;
    const qualifiedAppBundleId = `${Utils.NickName}.${appBundleName}+${Utils.Alias}`;
    if (!appBundles.data.includes(qualifiedAppBundleId)) {
        const appBundleSpec = dav3.AppBundle.constructFromObject({
            package: appBundleName,
            engine: engineName,
            id: appBundleName,
            description: `Description for ${appBundleName}`
        });
        try {
            newAppVersion = await api.createAppBundle(appBundleSpec);
        } catch (ex) {
            console.error(ex);
            return (res.status(500).json({
                diagnostic: 'Cannot create new app'
            }));
        }

        const aliasSpec = 
        {
            id: Utils.Alias,
            version: 1
        };
        try {
            const newAlias = await api.createAppBundleAlias(appBundleName, aliasSpec);
        } catch (ex) {
            console.error(ex);
            return (res.status(500).json({
                diagnostic: 'Failed to create an alias'
            }));
        }
    } else {
        const appBundleSpec = 
        {
            engine: engineName,
            description: appBundleName
        };
        try {
            newAppVersion = await api.createAppBundleVersion(appBundleName, appBundleSpec);
        } catch (ex) {
            console.error(ex);
            return (res.status(500).json({
                diagnostic: 'Cannot create new version'
            }));
        }

        const aliasSpec = 
        {
            version: newAppVersion.Version
        };
        try {
            const newAlias = await api.modifyAppBundleAlias(appBundleName, Utils.Alias, aliasSpec);
        } catch (ex) {
            console.error(ex);
            return (res.status(500).json({
                diagnostic: 'Failed to create an alias'
            }));
        }
    }

    try {
        await Utils.uploadFormDataWithFile(
            packageZipPath,
            newAppVersion.uploadParameters.endpointURL,
            newAppVersion.uploadParameters.formData
        );
    } catch (ex) {
        console.error(ex);
        return (res.status(500).json({
            diagnostic: 'Failed to upload bundle on s3'
        }));
    }

    res.status(200).json({
        appBundle: qualifiedAppBundleId,
        version: newAppVersion.version
    });
});

module.exports = router;
