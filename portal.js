;(function(window, document, undefined) {

    'use strict';

    var INSTANCE_COUNT = 0;

    // portal will be bound to the window object using this name
    var NAME = 'Portal';

     // Portal defaults.
     // Can be overridden with a config object when creating portal object
    var DEFAULTS = {
        selector: '#portal',
        uploadUrl: '/upload.php', 
        maxParallelUploads: 10,
        validFiletypes: ['txt', 'md', 'pdf', 'png', 'jpg', 'gif', 'mp3', 'avi', 'mkv', 'mp4'],
        maxFilesize: 1000 * 1000 * 100,
        timeout: 10000
    };
    
    /**
     * Portal object
     *
     * @param {object} config - the config object to override defaults
     */
    function Portal(config) {

        /**
         * Portal configuration object
         * 
         * @public
         * @property {object}
         */
        this.config = {};

        /**
         * lock for uploads 
         *
         * @private
         * @property {boolean}
         */
        this._lock = false;

        /**
         * internal object for private data
         *
         * @private
         * @property {object}
         */
        this._data = {};

        /**
         * Dom element(s) used for file drop bindings
         *
         * @public
         * @property {array}
         */
        this._data.portals;

        /**
         * Holds the requests objects before upload 
         *
         * @private
         * @property {array}
         */
        this._data.requests =  [];

        /**
         * Holds the requests objects in process of being uploaded
         *
         * @private
         * @property {object}
         */
        this._data.requestsInProgress = {};

        /**
         * Number of created uploads
         * 
         * @private
         * @property {int}
         */
        this._data.uploadsCreated = 0;
            
        /**
         * Number of attempted uploads
         * 
         * @private
         * @property {int}
         */
        this._data.uploadsAttempted = 0;

        /**
         * Number of failed uploads 
         *          
         * @private
         * @property {int}
         */
        this._data.uploadsFailed = 0;

        /**
         * Number of uploads completed successfully
         *          
         * @private
         * @property {int}
         */
        this._data.uploadsCompleted = 0;

        /**
         * Event types 
         *          
         * @private
         * @property {array}
         */
        this._data.events = [
                'uploadCreate',
                'uploadStart',
                'uploadProgress',
                'uploadDone',
                'uploadSuccess',
                'uploadFail',
                'uploadTimeout',
                'uploadInvalid'
            ];
        
        /**
         * Event type queues
         *          
         * @private
         * @property {object}
         */
        this._data.eventQueues = (function(self) {
                var _ = {};
                for (var i = 0; i < self._data.events.length; i++) {
                    _[self._data.events[i]] = [];            
                }
                return _;
            })(this);

        // initialise the portal object
        this._initialise(DEFAULTS, config);
    };

    /**
    * Function for binding functions to events
    *          
    * @public
    * @method
    * @param {string} - event name
    * @param {function} - callback function for when event fires
    */
    Portal.prototype.on = function(event, callback){
        if (this._validEvent(event)) {
            this._data.eventQueues[event].push(callback); 
        }
    };

    /**
    * Function for retrieving target dom elements (portals) 
    *          
    * @private
    * @method
    */
    Portal.prototype._getPortals = function(){

        var selector = this.config.selector;
        
        if (selector[0] == '#') {
            var portals = [document.getElementById(selector.substring(1, selector.length))];
        } else if (selector[0] == '.') {
            var portals = document.getElementsByClassName(selector.substring(1, selector.length));
        } else {
            throw Error('Selector property must be a class or id. "' + selector + '" given.');
        }

        if (portals == null || portals[0] == null) {
            throw Error('No dom element(s) found for selector: "' + selector + '"');
        }

        this._data.portals = portals;
    };

    /**
     * Check if needle is in haystack 
     *          
     * @private
     * @method 
     * @param {string} needle
     * @param {array} haystack
     * @return {boolean}
     */
    Portal.prototype._inArray = function(needle, haystack) {
        return haystack.indexOf(needle) > -1;
    };

    /**
     * Check if event type is valid 
     *          
     * @private
     * @method 
     * @param {string} event - event name
     * @return {boolean}
     */
    Portal.prototype._validEvent = function(event) {
        return this._inArray(event, this._data.events);
    };

    /**
     * Fire event 
     *          
     * @private
     * @method 
     * @param {string} event - event name
     * @param {string} args - event callback
     */
    Portal.prototype._fireEvent = function(event, args) {
        if (this._validEvent(event)) {

            var eventSubscribers = this._data.eventQueues[event];

            for(var i = 0; i < eventSubscribers.length; i++) {
                eventSubscribers[i].apply(null, args);
            }
        }
    };

    /**
     * Convert bytes to human readable byte size 
     *          
     * @private
     * @method  
     * @param {float} numBytes - size of file in bytes
     * @return {string} - string representation of filesize
     */
    Portal.prototype._bytesToHumanReadable = function(numBytes) {
        
        var size;
        
        switch (true) {
            case (numBytes < 1000000):
                size = (numBytes / 1000).toFixed(3) + ' kB';
                break;
            case (numBytes < 1000000000):
                size = (numBytes / 1000000).toFixed(1) + ' MB'; 
                break;
            default:
                size = (numBytes / 1000000000).toFixed(1) + ' GB';
        }

        return size;
    };

    /**
     * Create a form data object 
     *          
     * @private
     * @method 
     * @param {object} file - file object
     * @return {object} 
     */
    Portal.prototype._createRequestData = function(file) {

        var form = new FormData();

        form.append('file', file);

        return form;
    };

    /**
     * Get function to bind to xhr onload event 
     *          
     * @private
     * @method 
     * @param {object} request - request object
     * @return {function} - function to executed on xhr request onload event
     */
    Portal.prototype._bindOnLoadEvent = function(request) {

        var that = this;

        return function() {
            if (request.xhr.status === 200) {
                that._fireEvent('uploadSuccess', [request.data, request.xhr.status, request.xhr.responseText]);            
                that._data.uploadsCompleted++;
            } else {
                that._fireEvent('uploadFail', [request.data, request.xhr.status, request.xhr.responseText]);
                that._data.uploadsFailed++;
            }

            delete that._data.requestsInProgress[request.data.num];

            that._fireEvent('uploadDone');
        };
    };

    /**
     * Get function to bind to xhr ontimeout event 
     *          
     * @private
     * @method 
     * @param {object} request - request object
     * @return {function} - function to executed on xhr request onload event
     */
    Portal.prototype._bindOnTimeOutEvent = function(request) {

        var that = this;

        return function() {

            that._fireEvent('uploadTimeout', [request.data, request.xhr.status, request.xhr.responseText]);            
            that._data.uploadsFailed++;

            delete that._data.requestsInProgress[request.data.num];

            that._fireEvent('uploadDone');
        };
    };

    /**
     * Callback for when an upload is completed 
     *          
     * @private
     * @method 
     */
    Portal.prototype._uploadDone = function() {
        this._processUploadQueue();
    };

    /**
     * Process uploads not yet in progress
     *
     * @private
     * @method
     */
    Portal.prototype._processUploadQueue = function() {

        if (! this._lock) {

            this._lock = true;

            var inProgress = Object.keys(this._data.requestsInProgress).length;

            if (this._data.requests.length && inProgress < this.config.maxParallelUploads) {

                    var batchSize = (this._data.requests.length > this.config.maxParallelUploads - inProgress) ? 
                                        this.config.maxParallelUploads - inProgress: 
                                        this._data.requests.length;

                    for (var i = 0; i < batchSize; i++) {
                        this._upload(); 
                    }
            }
            
            this._lock = false;
        }

    };

    /**
     * Get function to bind to xhr onprogress event 
     *          
     * @private
     * @method 
     * @param {object} request - request object
     * @return {function} - function to be executed on xhr request on progress event
     */
    Portal.prototype._bindOnProgressEvent = function(request) {

        var that = this;

        var percentComplete = 0;
        var loaded = 0;
        var perSec = 0;

        return function(e) {

            if (e.lengthComputable) {

                var date = new Date();

                percentComplete = e.loaded / e.total * 100 | 0;

                if (! this.nextSecond) this.nextSecond = 0;

                if (date.getTime() < this.nextSecond && percentComplete != 100) return;
                
                this.nextSecond = date.getTime() + 1000;

                perSec = e.loaded - loaded;
                loaded = e.loaded;

                that._fireEvent('uploadProgress', [
                    request.data, 
                    e, 
                    that._bytesToHumanReadable(perSec), 
                    that._bytesToHumanReadable(loaded), 
                    (e.loaded / e.total * 100 | 0)
                ]);

            }
        };
    };

    /**
     * Create a portal request object 
     *          
     * @private
     * @method 
     * @param {object} file - file object
     * @return {object} - portal request object
     */
    Portal.prototype._createRequestObject = function(file) {

        var requestData = this._createRequestData(file); 

        var requestObject = {
            data : {}
        };

        requestObject.data.num = ++this._data.uploadsCreated;
        requestObject.data.file = file;
        requestObject.data.file.readableSize = this._bytesToHumanReadable(file.size);
        requestObject._data = this._createRequestData(file);
        requestObject.xhr = this._createXMLHttpRequest(requestObject);
        requestObject.xhr.timeout = this.config.timeout;
        requestObject.xhr.onload = this._bindOnLoadEvent(requestObject);
        requestObject.xhr.upload.onprogress = this._bindOnProgressEvent(requestObject);
        requestObject.xhr.ontimeout = this._bindOnTimeOutEvent(requestObject);

        this._fireEvent('uploadCreate', [requestObject.data]);

        return requestObject;
    };

    /**
     * create a new XMLHttpRequest
     *
     * @private
     * @method
     * @return {object} - XMLHttpRequest
     */
    Portal.prototype._createXMLHttpRequest = function() {

        var HttpRequest = new XMLHttpRequest(); 
        HttpRequest.open('POST', this.config.uploadUrl, true);

        return HttpRequest;
    }

    /**
     * Upload file 
     *          
     * @private
     * @method 
     */
    Portal.prototype._upload = function() {

        if (this._data.requests.length) {

            var request = this._data.requests.pop();
            request.xhr.send(request._data);
            this._data.uploadsAttempted++;
            
            this._data.requestsInProgress[request.data.num] = request;
            this._fireEvent('uploadStart', [request.data]);
        }
    };

    /**
     * Check if file is valid based on portal config 
     *          
     * @private
     * @method 
     * @param {object} file - file object
     * @return {array} - errors
     */
    Portal.prototype._isValidFile = function(file) {

        var errors = [];

        if (! this._isValidFiletype(file.name)) {
            errors.push('Invalid filetype');
        }

        if (!this._isValidFilesize(file.size)) {
            errors.push('Filesize exceeds max');      
        }

        return errors;
    };

    /**
     * Check if file is valid size 
     *          
     * @private
     * @method 
     * @param filesize - filesize in bytes
     * @return {boolean}
     */
    Portal.prototype._isValidFilesize = function(filesize) {
        return filesize <= this.config.maxFilesize
    };

    /**
     * Check if filetype if valid based on portal config 
     *          
     * @private
     * @method 
     * @param {string} filename - name of file with extension
     * @return {boolean}
     */
    Portal.prototype._isValidFiletype = function(filename) {
        if (this._isHiddenFiletype(filename)) {
            return this._inArray(filename, this.config.validFiletypes);
        }
        return this._inArray(this._getFiletype(filename), this.config.validFiletypes);
    };

    /**
     * Check if file is hidden filetype 
     *          
     * @private
     * @method 
     * @param {string} filename - name of file
     * @return {boolean}
     */
    Portal.prototype._isHiddenFiletype = function(filename) {
        return filename[0] == '.';
    };

    /**
     * Get filetype (extension) 
     *          
     * @private
     * @method 
     * @param {string} filename - name of file with extension
     * @return {string}
     */
    Portal.prototype._getFiletype = function(filename) {
        return filename.substr((~-filename.lastIndexOf(".") >>> 0) + 2).toLowerCase();
    };

    /**
     * Process files passed from file drop event 
     *          
     * @private
     * @method 
     * @param {array} files - array of file objects 
     */
    Portal.prototype._handleDrop = function(files) {

        for (var i = 0; i < files.length; i++) {

            var errors = this._isValidFile(files[i]);

            if (errors.length) {     
                this._fireEvent('uploadInvalid', [files[i], errors]);
            } else {
                this._data.requests.unshift(this._createRequestObject(files[i]));
            }
        }

        this._processUploadQueue();
    };

    Portal.prototype._handleClick = function(e) {
        this._handleDrop(e.srcElement.files);
        //TODO
        // wrap the element in a form
        // reset the input
        // unwrap the element
    }

    /**
     * Initialize Portal object 
     *          
     * @private
     * @method 
     * @param {object} defaults - object of default settings
     * @param {object} options - user passed settings to override defaults
     */
    Portal.prototype._initialise = function(defaults, options) {

        this._updateConfig(defaults, options);

        // bind portal dom events
        this._bind();

        var that = this;
        
        this.on('uploadDone', function(){ 
            that._uploadDone()
        });
    };

    Portal.prototype._updateConfig = function(defaults, options) {

        if (typeof options == "undefined") return;

        var objs = [defaults, options];

        for (var i = 0; i < 2; i++) {
            var obj = objs[i];
            for(var key in obj) {
                this.config[key] = obj[key];
            } 
        } 
    };

    Portal.prototype._triggerClickEvent = function(elementId) {

            var evt;
            var el = document.getElementById(elementId);

            if (document.createEvent) {
                evt = document.createEvent("MouseEvents");
                evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            }

            evt.cancelBubble = true;

            (evt) ? el.dispatchEvent(evt) : (el.click && el.click());
    };

    Portal.prototype._createHiddenPortal = function(id) {

            var hiddenInput = document.createElement('input');
            hiddenInput.type = 'file';
            hiddenInput.setAttribute('multiple', 'multiple');
            hiddenInput.classList.add('hiddenPortal'); 
            hiddenInput.setAttribute('id', 'hiddenPortal-' + id); 
            hiddenInput.style.visibility = 'hidden';
    
            return hiddenInput;    
    }
    
    /**
     * Bind Portals dom events 
     *          
     * @private
     * @method 
     * @param {object} portal - dom element to bind to
     */
    Portal.prototype._bind = function() {

        var hiddenInput = this._createHiddenPortal(++INSTANCE_COUNT);

        document.body.appendChild(hiddenInput);

        hiddenInput.addEventListener('change', function(e) { 
                that._handleClick(e);
            }
        );

        this._getPortals();

        var that = this;

        for (var i = 0; i < this._data.portals.length; i++) {

            var portal = this._data.portals[i];

            // only divs allow uploads via click 
            if (portal.nodeName == "DIV") {
                portal.addEventListener('click', function(){
                that._triggerClickEvent(hiddenInput.id); 
                });
            }

            portal.ondragover = function(e) {
                e.preventDefault();
                return false;
            };
            
            portal.ondragenter = function(e) {
                if (that._inArray('Files', e.dataTransfer.types)) {
                    this.classList.add('active');
                    return false;
                }
            };

            portal.ondragleave = function(e) {
                if (that._inArray('Files', e.dataTransfer.types)) {
                    this.classList.remove('active');
                    return false;
                }
            };

            portal.ondrop = function(e) {
                if (that._inArray('Files', e.dataTransfer.types)) {
                    e.preventDefault();
                    this.classList.remove('active');
                    that._handleDrop(e.dataTransfer.files);
                    return false; 
                }
            };
        };
    };

    // expose portal
    window[NAME] = Portal;
        
})(window, document);
