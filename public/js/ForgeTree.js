$(document).ready(function () {
    prepareAppBucketTree();
    $('#refreshBuckets').click(function () {
      $('#appBuckets').jstree(true).refresh();
    });
  
    $('#createNewBucket').click(function () {
      createNewBucket();
    });
  
    $('#createBucketModal').on('shown.bs.modal', function () {
      $("#newBucketKey").focus();
    })
  
    $('#hiddenUploadField').change(function () {
      var node = $('#appBuckets').jstree(true).get_selected(true)[0];
      var _this = this;
      if (_this.files.length == 0) return;
      var file = _this.files[0];
      switch (node.type) {
        case 'bucket':
          var formData = new FormData();
          formData.append('fileToUpload', file);
          formData.append('bucketKey', node.id);
  
          $.ajax({
            url: '/api/forge/oss/objects',
            data: formData,
            processData: false,
            contentType: false,
            type: 'POST',
            success: function (data) {
              $('#appBuckets').jstree(true).refresh_node(node);
              _this.value = '';
            }
          });
          break;
      }
    });
  });
  
  function createNewBucket() {
    var bucketKey = $('#newBucketKey').val();
    jQuery.post({
      url: '/api/forge/oss/buckets',
      contentType: 'application/json',
      data: JSON.stringify({ 'bucketKey': bucketKey }),
      success: function (res) {
        $('#appBuckets').jstree(true).refresh();
        $('#createBucketModal').modal('toggle');
      },
      error: function (err) {
        if (err.status == 409)
          alert('Bucket already exists - 409: Duplicated')
        console.log(err);
      }
    });
  }
 
  function deleteBucket(id) {
    console.log("Delete bucket = " + id);
    $.ajax({
      type: 'DELETE',
      url: '/api/forge/oss/buckets/' + encodeURIComponent(id)
    }).done(function (data) {
        console.log(data);
        if (data.status === 'success') {
            $('#appBuckets').jstree(true).refresh()
            showProgress("Bucket deleted", "success")
        }
    }).fail(function(err) {
        console.log('DELETE /api/forge/oss/buckets call failed\n' + err.statusText);
    });
}
  
  function prepareAppBucketTree() {
    $('#appBuckets').jstree({
      'core': {
        'themes': { "icons": true },
        'data': {
          "url": '/api/forge/oss/buckets',
          "dataType": "json",
          'multiple': false,
          "data": function (node) {
            return { "id": node.id };
          }
        }
      },
      'types': {
        'default': {
          'icon': 'glyphicon glyphicon-question-sign'
        },
        '#': {
          'icon': 'glyphicon glyphicon-cloud'
        },
        'bucket': {
          'icon': 'glyphicon glyphicon-folder-open'
        },
        'object': {
          'icon': 'glyphicon glyphicon-file'
        }
      },
      "plugins": ["types", "state", "sort", "contextmenu"],
      contextmenu: { items: autodeskCustomMenu }
    }).on('loaded.jstree', function () {
      $('#appBuckets').jstree('open_all');
    }).bind("activate_node.jstree", function (evt, data) {
      if (data != null && data.node != null && data.node.type == 'object') {
        $("#forgeViewer").empty();
        var urn = data.node.id;
        getForgeToken(function (access_token) {
          jQuery.ajax({
            url: 'https://developer.api.autodesk.com/modelderivative/v2/designdata/' + urn + '/manifest',
            headers: { 'Authorization': 'Bearer ' + access_token },
            success: function (res) {
              if (res.status === 'success') launchViewer(urn);
              else $("#forgeViewer").html('The translation job still running: ' + res.progress + '. Please try again in a moment.');
            },
            error: function (err) {
              var msgButton = 'This file is not translated yet! ' +
                '<button class="btn btn-xs btn-info" onclick="translateObject()"><span class="glyphicon glyphicon-eye-open"></span> ' +
                'Start translation</button>'
              $("#forgeViewer").html(msgButton);
            }
          });
        })
      }
    });
  }
  
  function autodeskCustomMenu(autodeskNode) {
    var items;
  
    switch (autodeskNode.type) {
      case "bucket":
        items = {
          uploadFile: {
            label: "Upload file",
            action: function () {
              uploadFile();
            },
            icon: 'glyphicon glyphicon-cloud-upload'
          },
          deleteFile: {
            label: "Delete",
            action: function () {
              var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
              console.log(treeNode.id)
              deleteBucket(treeNode.id)
            },
            icon: 'glyphicon glyphicon-eye-open'
          }
        };
        break;
      case "object":
        items = {
          translateFile: {
            label: "Translate",
            action: function () {
              var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
              translateObject(treeNode);
            },
            icon: 'glyphicon glyphicon-eye-open'
          },
          deleteFile: {
            label: "Draw",
            action: function () {
              var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
              console.log(treeNode.text)
              console.log("treeNode.text")
            },
            icon: 'glyphicon glyphicon-eye-open'
          }
        };
        break;
    }
  
    return items;
  }

  function addDivDraw() {
    var picImage = document.getElementById("picImage")
    var div = document.createElement("div");
    div.className = "col-md-3"
    div.id = "right-board"

    var html = ''
    html += '<div class="this">'
    html += '<h3><b>Чертеж</b></h3>'
    html += "<img src='https://2.downloader.disk.yandex.ru/preview/398cda59733a411746e6dcf7249bfc648dde81e97f67c705e47f823fb71d15cb/inf/uTo6A8qriS3xQdAtZ-bTQ6fD1zyyKjn6ViQfZY-2tvi5r4IZA9nuFmN2KLYKn4dG8E6NdVJQmanvjndtmaCxag%3D%3D?uid=675240116&filename=%D0%A128.png&disposition=inline&hash=&limit=0&content_type=image%2Fpng&owner_uid=675240116&tknv=v2&size=1920x937'>"
    
    html += '<h3><b>Информация о размерах</b></h3>'
    html += '<table class="iksweb">'
    html += '<tbody>'
    html += '<tr>'
    html += '<th rowspan="2">s</th>'
    html += '<th rowspan="2">R</th>'
    html += '<th rowspan="2">e, не более</th>'
    html += '<th colspan="2">g</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<th>Номин.</th>'
    html += '<th>Перед.\n'
    html += 'откл.</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>От 1 '
    html += 'до 2</td>'
    html += '<td rowspan="4">От s '
    html += 'до 2s</td>'
    html += '<td>3s + 2</td>'
    html += '<td rowspan="4">0</td>'
    html += '<td rowspan="2">+1</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 2 '
    html += 'до 6</td>'
    html += '<td rowspan="2">2s + 3</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 6 '
    html += 'до 9</td>'
    html += '<td>+2</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 9 '
    html += 'до 12</td>'
    html += '<td>2s + 4</td>'
    html += '<td>+3</td>'
    html += '</tr>'
    html += '</tbody>'
    html += '</table>'

    html += '<h3><b>Справочная информация</b></h3>'
    html += "<p><b><i>Тип соединения:</b></i> Стыковое</p>"
    html += "<p><b><i>Форма подготовленных кромок:</b></i> С отбортовкой кромок</p>"
    html += "<p><b><i>Характер сварного шва:</b></i> Односторонний</p>"
    html += "<p><b><i>Толщина свариваемых деталей:</b></i> 1-12 мм</p></div>"
    
    div.innerHTML = html

    var row = $(".row").children();
    $(row[0]).removeClass('col-sm-4').addClass('col-sm-2 transition-width');
    $(row[1]).removeClass('col-sm-8').addClass('col-sm-7 transition-width');

    picImage.appendChild(div)
  }

  function showC1() {
    var picImage = document.getElementById("picImage")
    var div = document.createElement("div");
    div.className = "col-md-3"
    div.id = "right-board"

    var html = ''
    html += '<div class="this">'
    html += '<h3><b>Чертеж</b></h3>'
    html += "<img src='https://2.downloader.disk.yandex.ru/preview/82e8e7c4525ee5056a3768d1b1b5aa043f5d2c9946d1da581d13aaab0c575867/inf/_EyOFKI1tTtRCq5nx3nk28bkHo3xkKVOYKFn02eAQMwihSsuOg8AVS7IoDq2WPBgd11A94cUI3248VJgVGPYUg%3D%3D?uid=675240116&filename=%D0%A11.png&disposition=inline&hash=&limit=0&content_type=image%2Fpng&owner_uid=675240116&tknv=v2&size=1920x937'>"
    
    html += '<h3><b>Информация о размерах</b></h3>'
    html += '<table class="iksweb">'
    html += '<tbody>'
    html += '<tr>'
    html += '<th rowspan="2">S</th>'
    html += '<th colspan="2">b</th>'
    html += '<th rowspan="2">R</th>'
    html += '<th rowspan="2">i</th>'
    html += '<th rowspan="2">e, не более</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<th>Номин.</th>'
    html += '<th>Пред откл.</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>От 1 '
    html += 'до 2</td>'
    html += '<td rowspan="2">0</td>'
    html += '<td>+0,5</td>'
    html += '<td rowspan="2">от s до 2s</td>'
    html += '<td rowspan="2">от s до 3s</td>'
    html += '<td rowspan="2">2s + 3</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 2 '
    html += 'до 4</td>'
    html += '<td>+1,0</td>'
    html += '</tr>'
    html += '</tbody>'
    html += '</table>'

    html += '<h3><b>Справочная информация</b></h3>'
    html += "<p><b><i>Тип соединения:</b></i> Стыковое</p>"
    html += "<p><b><i>Форма подготовленных кромок:</b></i> С отбортовкой кромок</p>"
    html += "<p><b><i>Характер сварного шва:</b></i> Односторонний</p>"
    html += "<p><b><i>Толщина свариваемых деталей:</b></i> 1-4 мм</p></div>"

    div.innerHTML = html

    var row = $(".row").children();
    $(row[0]).removeClass('col-sm-4').addClass('col-sm-2 transition-width');
    $(row[1]).removeClass('col-sm-8').addClass('col-sm-7 transition-width');

    picImage.appendChild(div)
  }

  function showC2() {
    var picImage = document.getElementById("picImage")
    var div = document.createElement("div");
    div.className = "col-md-3"
    div.id = "right-board"

    var html = ''
    html += '<div class="this">'
    html += '<h3><b>Чертеж</b></h3>'
    html += "<img src='https://2.downloader.disk.yandex.ru/preview/ec17fb168ea3a18a8853cb32f1be04592c8e005f13f6cf61819ccbacd05a589a/inf/Kcf0NjrQCLFMLalOwQ_NUIqaRsgKv_gbxh8SRKvWdvZ5mjdOFSkehIHvLLeshFpHn0WE4-pTo3fNHFSasQZE1A%3D%3D?uid=675240116&filename=%D0%A12.png&disposition=inline&hash=&limit=0&content_type=image%2Fpng&owner_uid=675240116&tknv=v2&size=1920x937'>"
    
    html += '<h3><b>Информация о размерах</b></h3>'
    html += '<table class="iksweb">'
    html += '<tbody>'
    html += '<tr>'
    html += '<th rowspan="2">s = s1</th>'
    html += '<th colspan="2">b</th>'
    html += '<th rowspan="2"> e, не более</th>'
    html += '<th colspan="2">g</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<th>Но-\n мин.</th>'
    html += '<th>Пред. '
    html += 'откл.</th>'
    html += '<th>Но-\n мин.</th>'
    html += '<th>Пред. '
    html += 'откл.</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>от 1,0 до 1,5</td>'
    html += '<td>0</td>'
    html += '<td>+0,5</td>'
    html += '<td>6</td>'
    html += '<td>1,0</td>'
    html += '<td>±0,5</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 1,5 до 3,0</td>'
    html += '<td>1</td>'
    html += '<td>±1,0</td>'
    html += '<td>7</td>'
    html += '<td>1,5</td>'
    html += '<td rowspan="2">±1,0</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 3,0 до 4,0</td>'
    html += '<td>2</td>'
    html += '<td>+1,0'
    html += '-0,5</td>'
    html += '<td>8</td>'
    html += '<td>2,0</td>'
    html += '</tr>'
    html += '</tbody>'
    html += '</table>'

    html += '<h3><b>Справочная информация</b></h3>'
    html += "<p><b><i>Тип соединения:</b></i> Стыковое</p>"
    html += "<p><b><i>Форма подготовленных кромок:</b></i> Без скоса кромок</p>"
    html += "<p><b><i>Характер сварного шва:</b></i> Односторонний</p>"
    html += "<p><b><i>Толщина свариваемых деталей:</b></i> 1-4 мм</p></div>"

    div.innerHTML = html

    var row = $(".row").children();
    $(row[0]).removeClass('col-sm-4').addClass('col-sm-2 transition-width');
    $(row[1]).removeClass('col-sm-8').addClass('col-sm-7 transition-width');

    picImage.appendChild(div)
  }

  function showC3() {
    var picImage = document.getElementById("picImage")
    var div = document.createElement("div");
    div.className = "col-md-3"
    div.id = "right-board"

    var html = ''
    html += '<div class="this">'
    html += '<h3><b>Чертеж</b></h3>'
    html += "<img src='https://1.downloader.disk.yandex.ru/preview/6a843b0184576c58e57623de8a34ee97c7af9ef3a78f379cf1f181c7166c0b98/inf/u7nJH2HCsCR-WwIeMRSkxM4YBjR3fgkukrYHkcLovO3kAlpdtBGpsEqGN9dYtHRDoLf-O_N-VYNq7vik4OJHOw%3D%3D?uid=675240116&filename=%D0%A13.png&disposition=inline&hash=&limit=0&content_type=image%2Fpng&owner_uid=675240116&tknv=v2&size=1920x937'>"
    
    html += '<h3><b>Информация о размерах</b></h3>'
    html += '<table class="iksweb">'
    html += '<tbody>'
    html += '<tr>'
    html += '<th rowspan="2">s</th>'
    html += '<th colspan="2">b</th>'
    html += '<th rowspan="2">R</th>'
    html += '<th rowspan="2">i</th>'
    html += '<th rowspan="2">e, не более</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<th>Номин.</th>'
    html += '<th>Пред. откл.</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>От 1 до 2</td>'
    html += '<td rowspan="2">0</td>'
    html += '<td>+0,5</td>'
    html += '<td rowspan="2">От s до 2s</td>'
    html += '<td rowspan="2">От s до 3s</td>'
    html += '<td rowspan="2">2s + 3</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 2 до 4</td>'
    html += '<td>+1,0</td>'
    html += '</tr>'
    html += '</tbody>'
    html += '</table>'

    html += '<h3><b>Справочная информация</b></h3>'
    html += "<p><b><i>Тип соединения:</b></i> Стыковое</p>"
    html += "<p><b><i>Форма подготовленных кромок:</b></i> С отбортовкой одной кромки</p>"
    html += "<p><b><i>Характер сварного шва:</b></i> Односторонний</p>"
    html += "<p><b><i>Толщина свариваемых деталей:</b></i> 1-4 мм</p></div>"

    div.innerHTML = html

    var row = $(".row").children();
    $(row[0]).removeClass('col-sm-4').addClass('col-sm-2 transition-width');
    $(row[1]).removeClass('col-sm-8').addClass('col-sm-7 transition-width');

    picImage.appendChild(div)
  }

  function showC7() {
    var picImage = document.getElementById("picImage")
    var div = document.createElement("div");
    div.className = "col-md-3"
    div.id = "right-board"

    var html = ''
    html += '<div class="this">'
    html += '<h3><b>Чертеж</b></h3>'
    html += "<img src='https://3.downloader.disk.yandex.ru/preview/16fb458abcc57b52f6e20f9ed89a3f835ee790f277500ced7db40122ddc6dd4e/inf/sQ1VoGuyR2z8U5Z6S4tHS23LTtcoeu8OLyR-80_L5m1WIbOIKD8IFLhlLN4BHLI3ffPskHKqAtUwIp4NM4FdPg%3D%3D?uid=675240116&filename=%D0%A17.png&disposition=inline&hash=&limit=0&content_type=image%2Fpng&owner_uid=675240116&tknv=v2&size=1920x937'>"
   
    html += '<h3><b>Информация о размерах</b></h3>'
    html += '<table class="iksweb">'
    html += '<tbody>'
    html += '<tr>'
    html += '<th rowspan="2">s = s1</th>'
    html += '<th colspan="2">b</th>'
    html += '<th rowspan="2">e, не более</th>'
    html += '<th rowspan="2">g ±1</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<th>Номин.</th>'
    html += '<th>Пред. откл.</th>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>2</td>'
    html += '<td rowspan="3">2</td>'
    html += '<td rowspan="2">±1,0</td>'
    html += '<td>8</td>'
    html += '<td rowspan="2">1,5</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 2 до 4</td>'
    html += '<td>9</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>Св. 4 до 5</td>'
    html += '<td>+1,5'
    html += '-1,0</td>'
    html += '<td>10</td>'
    html += '<td>2,0</td>'
    html += '</tr>'
    html += '</tbody>'
    html += '</table>'

    html += '<h3><b>Справочная информация</b></h3>'
    html += "<p><b><i>Тип соединения:</b></i> Стыковое</p>"
    html += "<p><b><i>Форма подготовленных кромок:</b></i> Без скоса кромокs</p>"
    html += "<p><b><i>Характер сварного шва:</b></i> Двусторонний</p>"
    html += "<p><b><i>Толщина свариваемых деталей:</b></i> 2-5 мм</p></div>"

    div.innerHTML = html

    var row = $(".row").children();
    $(row[0]).removeClass('col-sm-4').addClass('col-sm-2 transition-width');
    $(row[1]).removeClass('col-sm-8').addClass('col-sm-7 transition-width');

    picImage.appendChild(div)
  }
  
  function uploadFile() {
    $('#hiddenUploadField').click();
  }
  
  function translateObject(node) {
    $("#forgeViewer").empty();
    if (node == null) node = $('#appBuckets').jstree(true).get_selected(true)[0];
    var bucketKey = node.parents[0];
    var objectKey = node.id;
    jQuery.post({
      url: '/api/forge/modelderivative/jobs',
      contentType: 'application/json',
      data: JSON.stringify({ 'bucketKey': bucketKey, 'objectName': objectKey }),
      success: function (res) {
        $("#forgeViewer").html('Translation started! Please try again in a moment.');
      },
    });
  }
