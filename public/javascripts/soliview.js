function soliview(id, model) {

	if (!Detector.webgl)
		Detector.addGetWebGLMessage();

	var container;
	var file;

	var divHeight = $("#model" + id).height();
	var divWidth = $("#model" + id).width();

	container = document.createElement('div');
	container.setAttribute('id', "soliviewer");
	document.getElementById('model' + id).appendChild(container);

	var viewer = createViewer(container, divWidth, divHeight);
	viewer.readStl(readBinaryFile(model ) );
	
	$("#model" + id).mouseout(function() {
		viewer.toggleControls(false);
	})
	
	$("#model" + id).mouseenter(function() {
		viewer.toggleControls(true);
	})
    return viewer.getRender();
    
};

var readBinaryFile = function (url) {
	var content, newContent = "";
	 
	$.ajax({
	dataType: 'text',
	mimeType: 'text/plain; charset=x-user-defined',
	url: url,
	async: false,
	cache: false,
	success: function (theContent) {
	for (var i = 0; i < theContent.length; i++) {
	newContent += String.fromCharCode(theContent.charCodeAt(i) & 0xFF);
	}
	content = newContent;
	}
	});
	 
	return content;
	}; 

