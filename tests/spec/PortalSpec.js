'use strict';
// stub method for dom binding as we are testing without a DOM
Portal.prototype._bind = function(){};

describe("Portal", function() {

    var portal;

    beforeEach(function() {
        portal = new Portal({});
        var DOMContentLoaded_event = document.createEvent("Event")
        DOMContentLoaded_event.initEvent("DOMContentLoaded", true, true)
        window.document.dispatchEvent(DOMContentLoaded_event);
    });

    it("We can create a portal instance successfully", function(){
        expect(portal).toEqual(jasmine.any(Object));
    });

    it("We can override config with object passed to constructor", function(){
        var customisedPortal = new Portal({maxUploads: 100});
        var DOMContentLoaded_event = document.createEvent("Event")
        DOMContentLoaded_event.initEvent("DOMContentLoaded", true, true)
        window.document.dispatchEvent(DOMContentLoaded_event);
        expect(customisedPortal.config.maxUploads).toEqual(100);
    });

    it("_handleDrop function creates request queue properly", function(){
        spyOn(portal, '_processUploadQueue');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        expect(portal._data.requests.length).toEqual(1);
    });

    it("uploadCreate event is fired when upload is created successfully", function(){
        spyOn(portal, '_processUploadQueue');
        spyOn(portal, '_fireEvent');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        expect(portal._fireEvent.calls.count()).toEqual(1);
        expect(portal._fireEvent.calls.mostRecent().args[0]).toEqual('uploadCreate');
    });

    it("uploadCreate event handler is called when an upload is created successfully", function(){
        var eventHandler = jasmine.createSpyObj('handler', ['foo']);
        portal.on('uploadCreate', eventHandler.foo);
        spyOn(portal, '_processUploadQueue');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        expect(eventHandler.foo.calls.count()).toEqual(1);
    });

    it("HTTP request is made after _handleDrop if the requests in progress is not greater than max uploads", function(){
        spyOn(XMLHttpRequest.prototype, 'open'); 
        spyOn(XMLHttpRequest.prototype, 'send'); 
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        expect(XMLHttpRequest.prototype.send).toHaveBeenCalled();
    });

    it("uploadStart event is fired when upload is created successfully", function(){
        spyOn(XMLHttpRequest.prototype, 'open'); 
        spyOn(XMLHttpRequest.prototype, 'send'); 
        spyOn(portal, '_fireEvent');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        expect(portal._fireEvent.calls.count()).toEqual(2);
        expect(portal._fireEvent.calls.mostRecent().args[0]).toEqual('uploadStart');
    });

    it("uploadCreate event handler is called when an upload is created successfully", function(){
        spyOn(XMLHttpRequest.prototype, 'open'); 
        spyOn(XMLHttpRequest.prototype, 'send'); 
        var eventHandler = jasmine.createSpyObj('handler', ['foo']);
        portal.on('uploadStart', eventHandler.foo);
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        expect(eventHandler.foo.calls.count()).toEqual(1);
    });

    it("uploadProgress event is fired when xhr uploadprogress event is fired", function(){
        spyOn(XMLHttpRequest.prototype, 'open'); 
        spyOn(XMLHttpRequest.prototype, 'send'); 
        spyOn(portal, '_fireEvent');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.upload.onprogress({lengthComputable: true, total: 100, loaded: 0})
        expect(portal._fireEvent.calls.mostRecent().args[0]).toEqual('uploadProgress');
    });

    it("uploadProgress event handler is called when uploadProgress event is fired", function(){
        spyOn(XMLHttpRequest.prototype, 'open'); 
        spyOn(XMLHttpRequest.prototype, 'send'); 
        var eventHandler = jasmine.createSpyObj('handler', ['foo']);
        portal.on('uploadProgress', eventHandler.foo);
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.upload.onprogress({lengthComputable: true, total: 100, loaded: 0})
        expect(eventHandler.foo.calls.count()).toEqual(1);
    });

    it("uploadDone event is fired when xhr onload event is fired", function(){
        spyOn(XMLHttpRequest.prototype, 'open'); 
        spyOn(XMLHttpRequest.prototype, 'send'); 
        spyOn(portal, '_fireEvent');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.onload();
        expect(portal._fireEvent.calls.mostRecent().args[0]).toEqual('uploadDone');
    });

    it("uploadDone event handler is called on when uploadDone event is fired", function(){
        spyOn(XMLHttpRequest.prototype, 'open'); 
        spyOn(XMLHttpRequest.prototype, 'send'); 
        var eventHandler = jasmine.createSpyObj('handler', ['foo']);
        portal.on('uploadDone', eventHandler.foo);
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.onload();
        expect(eventHandler.foo.calls.count()).toEqual(1);
    });

    it("uploadSuccess event is fired when upload is completed successfully", function(){
        var xhrMock = {open: function(){}, send: function(){}, upload: ''}
        spyOn(portal, '_createXMLHttpRequest').and.returnValue(xhrMock);
        spyOn(portal, '_fireEvent');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.status = 200;
        portal._data.requestsInProgress[1].xhr.onload();
        expect(portal._fireEvent.calls.argsFor(2)[0]).toEqual('uploadSuccess');
    });

    it("uploadSuccess event handler is called when upload is completed successfully", function(){
        var xhrMock = {open: function(){}, send: function(){}, upload: ''}
        spyOn(portal, '_createXMLHttpRequest').and.returnValue(xhrMock);
        var eventHandler = jasmine.createSpyObj('handler', ['foo']);
        portal.on('uploadSuccess', eventHandler.foo);
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.status = 200;
        portal._data.requestsInProgress[1].xhr.onload();
        expect(eventHandler.foo.calls.count()).toEqual(1);
    });

    it("uploadFail event is fired on when upload fails", function(){
        var xhrMock = {open: function(){}, send: function(){}, upload: ''}
        spyOn(portal, '_createXMLHttpRequest').and.returnValue(xhrMock);
        spyOn(portal, '_fireEvent');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.status = 0;
        portal._data.requestsInProgress[1].xhr.onload();
        expect(portal._fireEvent.calls.argsFor(2)[0]).toEqual('uploadFail');
    });

    it("uploadFail event handler is called when upload is completed successfully", function(){
        var xhrMock = {open: function(){}, send: function(){}, upload: '', status: 0}
        spyOn(portal, '_createXMLHttpRequest').and.returnValue(xhrMock);
        var eventHandler = jasmine.createSpyObj('handler', ['foo']);
        portal.on('uploadFail', eventHandler.foo);
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.onload();
        expect(eventHandler.foo.calls.count()).toEqual(1);
    });

    it("Upload should fail if type is invalid", function(){
        spyOn(portal, '_processUploadQueue');
        spyOn(portal, '_fireEvent');
        portal.config.validFiletypes = ['pdf'];
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        expect(portal._data.requests.length).toEqual(0);
        expect(portal._fireEvent.calls.mostRecent().args[0]).toEqual('uploadInvalid');
    });

    it("Upload should fail if type is invalid with hidden filetypes", function(){
        spyOn(portal, '_processUploadQueue');
        spyOn(portal, '_fireEvent');
        portal.config.validFiletypes = ['.htaccess'];
        portal._handleDrop([{name: '.htaccess', size: 1}, {name: '.profile', size: 1}]);
        expect(portal._data.requests.length).toEqual(1);
        expect(portal._data.requests[0].data.file.name).toEqual('.htaccess');
        expect(portal._fireEvent.calls.mostRecent().args[0]).toEqual('uploadInvalid');
    });

    it("Upload should fail if filesize is too big", function(){
        spyOn(portal, '_processUploadQueue');
        spyOn(portal, '_fireEvent');
        portal.config.maxFilesize = 50;
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        expect(portal._data.requests.length).toEqual(0);
        expect(portal._fireEvent.calls.mostRecent().args[0]).toEqual('uploadInvalid');
    });

    it("uploadTimeout is fired when upload times out", function(){
        var xhrMock = {open: function(){}, send: function(){}, upload: ''}
        spyOn(portal, '_createXMLHttpRequest').and.returnValue(xhrMock);
        spyOn(portal, '_fireEvent');
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.status = 0;
        portal._data.requestsInProgress[1].xhr.ontimeout();
        expect(portal._fireEvent.calls.argsFor(2)[0]).toEqual('uploadTimeout');
    });

    it("uploadTimeout event handler is called when upload times out", function(){
        var xhrMock = {open: function(){}, send: function(){}, upload: '', status: 0}
        spyOn(portal, '_createXMLHttpRequest').and.returnValue(xhrMock);
        var eventHandler = jasmine.createSpyObj('handler', ['foo']);
        portal.on('uploadTimeout', eventHandler.foo);
        portal._handleDrop([{name: 'test.jpg', size: 100}]);
        portal._data.requestsInProgress[1].xhr.ontimeout();
        expect(eventHandler.foo.calls.count()).toEqual(1);
    });

    it("Requests in progress should be determined not exceed max parallel uploads", function(){
        portal.config.maxParallelUploads = 1; 
        var xhrMock = {open: function(){}, send: function(){}, upload: '', status: 0}
        spyOn(portal, '_createXMLHttpRequest').and.returnValue(xhrMock);
        portal._handleDrop([{name: 'test.jpg', size: 100}, {name: 'test2.jpg', size: 100}]);
        expect(Object.keys(portal._data.requestsInProgress).length).toBe(1);        
        expect(portal._data.requestsInProgress[1].data.file.name).toBe('test.jpg');
    });
    
    it("xhr onload event should trigger next upload", function(){
        spyOn(XMLHttpRequest.prototype, 'send');
        spyOn(XMLHttpRequest.prototype, 'open');
        portal.config.maxParallelUploads = 1; 
        portal._handleDrop([{name: 'test1.jpg', size: 100}, {name: 'test2.jpg', size: 100}, {name: 'test3.jpg', size: 100}]);
        expect(portal._data.requestsInProgress[1].data.file.name).toBe('test1.jpg');
        portal._data.requestsInProgress[1].xhr.onload();
        expect(portal._data.requestsInProgress[2].data.file.name).toBe('test2.jpg');
    });
});
