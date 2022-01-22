var viewer;

function launchViewer(urn) {
  var options = {
    env: 'AutodeskProduction',
    getAccessToken: getForgeToken
  };

  Autodesk.Viewing.Initializer(options, () => {
    viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('forgeViewer'), { extensions: [ 'Autodesk.DocumentBrowser','HandleSelectionExtension'] });
    viewer.start();
    var documentId = 'urn:' + urn;
    Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
  });
}

function onDocumentLoadSuccess(doc) {
  var viewables = doc.getRoot().getDefaultGeometry();
  viewer.loadDocumentNode(doc, viewables).then(i => {
    var old = document.getElementById("right-board")
    if (old != null) old.remove()
    console.log(doc)
    console.log("С28.ipt".localeCompare(doc.myData.children[0].name))
    if (doc.myData.children[0].name.toString().includes("С28")) addDivDraw();
    if (doc.myData.children[0].name.toString().includes("C1")) showC1();
    if (doc.myData.children[0].name.toString().includes("C2")) showC2();
    if (doc.myData.children[0].name.toString().includes("C3")) showC3();
    if (doc.myData.children[0].name.toString().includes("C7")) showC7();
    console.log(doc.myData.children[0].name)
  });
}

function onDocumentLoadFailure(viewerErrorCode) {
  console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
}

function getForgeToken(callback) {
  fetch('/api/forge/oauth/token').then(res => {
    res.json().then(data => {
      callback(data.access_token, data.expires_in);
    });
  });
}
