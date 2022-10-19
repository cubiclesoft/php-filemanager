// FlexForms Javascript base and Designer classes.
// (C) 2022 CubicleSoft.  All Rights Reserved.

(function() {
	if (window.hasOwnProperty('FlexForms'))  return;

	// FlexForms base class.
	var FlexFormsInternal = function() {
		if (!(this instanceof FlexFormsInternal))  return new FlexFormsInternal();

		var triggers = {}, version = '', cssoutput = {}, cssleft = 0, jsqueue = {}, ready = false, initialized = false;
		var $this = this;

		// Internal functions.
		var DispatchEvent = function(eventname, params) {
			if (!triggers[eventname])  return;

			triggers[eventname].forEach(function(callback) {
				if (Array.isArray(params))  callback.apply($this, params);
				else  callback.call($this, params);
			});
		};

		// Public DOM-style functions.
		$this.addEventListener = function(eventname, callback) {
			if (!triggers[eventname])  triggers[eventname] = [];

			for (var x in triggers[eventname])
			{
				if (triggers[eventname][x] === callback)  return;
			}

			triggers[eventname].push(callback);
		};

		$this.removeEventListener = function(eventname, callback) {
			if (!triggers[eventname])  return;

			for (var x in triggers[eventname])
			{
				if (triggers[eventname][x] === callback)
				{
					triggers[eventname].splice(x, 1);

					return;
				}
			}
		};

		$this.hasEventListener = function(eventname) {
			return (triggers[eventname] && triggers[eventname].length);
		};

		$this.modules = {};

		$this.SetVersion = function(newver) {
			version = newver;
		};

		$this.GetVersion = function() {
			return version;
		};

		$this.RegisterCSSOutput = function(info) {
			Object.assign(cssoutput, info);
		};

		var CheckEmptyAndNotify = function() {
			if (cssleft)  return;

			for (var x in jsqueue)
			{
				if (jsqueue.hasOwnProperty(x))  return;
			}

			DispatchEvent('done');
		};

		$this.LoadCSS = function(name, url, cssmedia) {
			if (cssoutput[name] !== undefined)
			{
				CheckEmptyAndNotify();

				return cssoutput[name];
			}

			if (version !== '')  url += (url.indexOf('?') > -1 ? '&' : '?') + version;

			var tag = document.createElement('link');

			tag._loaded = false;
			tag.onload = function(e) {
				tag._loaded = true;

				cssleft--;
				CheckEmptyAndNotify();
			};

			cssleft++;

			tag.rel = 'stylesheet';
			tag.type = 'text/css';
			tag.href = url;
			tag.media = (cssmedia != undefined ? cssmedia : 'all');

			document.getElementsByTagName('head')[0].appendChild(tag);

			cssoutput[name] = tag;

			return tag;
		};

		$this.AddCSS = function(name, css, cssmedia) {
			if (cssoutput[name] !== undefined)
			{
				CheckEmptyAndNotify();

				return cssoutput[name];
			}

			var tag = document.createElement('style');
			tag.type = 'text/css';
			tag.media = (cssmedia != undefined ? cssmedia : 'all');

			document.getElementsByTagName('head')[0].appendChild(tag);

			if (tag.styleSheet)  tag.styleSheet.cssText = css;
			else  tag.appendChild(document.createTextNode(css));

			tag._loaded = true;

			cssoutput[name] = tag;

			CheckEmptyAndNotify();

			return tag;
		};

		$this.AddJSQueueItem = function(name, info) {
			jsqueue[name] = info;
		};

		var LoadJSQueueItem = function(name) {
			var done = false;
			var s = document.createElement('script');

			jsqueue[name].loading = true;
			jsqueue[name].retriesleft = jsqueue[name].retriesleft || 3;

			s.onload = function() {
				if (!done)  { done = true;  delete jsqueue[name];  $this.ProcessJSQueue(); }
			};

			s.onreadystatechange = function() {
				if (!done && s.readyState === 'complete')  { done = true;  delete jsqueue[name];  $this.ProcessJSQueue(); }
			};

			s.onerror = function() {
				if (!done)
				{
					done = true;

					jsqueue[name].retriesleft--;
					if (jsqueue[name].retriesleft > 0)
					{
						jsqueue[name].loading = false;

						setTimeout($this.ProcessJSQueue, 250);
					}
				}
			};

			s.src = jsqueue[name].src + (version === '' ? '' : (jsqueue[name].src.indexOf('?') > -1 ? '&' : '?') + version);

			document.body.appendChild(s);
		};

		$this.GetObjectFromPath = function(path) {
			var obj = window;
			path = path.split('.');
			for (var x = 0; x < path.length; x++)
			{
				if (obj[path[x]] === undefined)  return;

				obj = obj[path[x]];
			}

			return obj;
		};

		$this.ProcessJSQueue = function() {
			ready = true;

			for (var name in jsqueue) {
				if (jsqueue.hasOwnProperty(name))
				{
					if ((jsqueue[name].loading === undefined || jsqueue[name].loading === false) && (jsqueue[name].dependency === false || jsqueue[jsqueue[name].dependency] === undefined))
					{
						if (jsqueue[name].detect !== undefined && $this.GetObjectFromPath(jsqueue[name].detect) !== undefined)  delete jsqueue[name];
						else if (jsqueue[name].mode === "src")  LoadJSQueueItem(name);
						else if (jsqueue[name].mode === "inline")
						{
							jsqueue[name].src();

							delete jsqueue[name];
						}
					}
				}
			}

			CheckEmptyAndNotify();
		};

		$this.Init = function() {
			if (ready)  $this.ProcessJSQueue();
			else if (!initialized)
			{
				if (document.addEventListener)
				{
					function regevent(event) {
						document.removeEventListener("DOMContentLoaded", regevent);

						$this.ProcessJSQueue();
					}

					document.addEventListener("DOMContentLoaded", regevent);
				}
				else
				{
					setTimeout($this.ProcessJSQueue(), 250);
				}

				initialized = true;
			}
		};
	};

	window.FlexForms = new FlexFormsInternal();

	window.FlexForms.Init();
})();

(function() {
	if (window.FlexForms.hasOwnProperty('Designer'))  return;

	var EscapeHTML = function(text) {
		var map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};

		return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
	}

	var FormatStr = function(format) {
		var args = Array.prototype.slice.call(arguments, 1);

		return format.replace(/{(\d+)}/g, function(match, number) {
			return (typeof args[number] != 'undefined' ? args[number] : match);
		});
	};

	var CreateNode = function(tag, classes, attrs, styles) {
		var elem = document.createElement(tag);

		if (classes)
		{
			if (typeof classes === 'string')  elem.className = classes;
			else  elem.className = classes.join(' ');
		}

		if (attrs)  Object.assign(elem, attrs);

		if (styles)  Object.assign(elem.style, styles);

		return elem;
	};

	var DebounceAttributes = function(options) {
		if (!(this instanceof DebounceAttributes))  return new DebounceAttributes(options);

		var intervaltimer = null, numsame;
		var $this = this;

		var defaults = {
			watchers: [],
			interval: 50,
			stopsame: 1,

			callback: null,
			intervalcallback: null
		};

		$this.settings = Object.assign({}, defaults, options);

		var MainIntervalHandler = function() {
			var nummatches = 0;

			for (var x = 0; x < $this.settings.watchers.length; x++)
			{
				var watcher = $this.settings.watchers[x];

				if (watcher.val === watcher.elem[watcher.attr])  nummatches++;
				else  watcher.val = watcher.elem[watcher.attr];
			}

			if (nummatches < $this.settings.watchers.length)
			{
				numsame = 0;

				if ($this.settings.intervalcallback)  $this.settings.intervalcallback.call($this);
			}
			else
			{
				numsame++;

				if (numsame >= $this.settings.stopsame)
				{
					$this.Stop();

					if ($this.settings.intervalcallback)  $this.settings.intervalcallback.call($this);

					if ($this.settings.callback)  $this.settings.callback.call($this);
				}
			}
		};


		// Public functions.

		$this.Start = function() {
			if (!intervaltimer)
			{
				numsame = 0;

				intervaltimer = setInterval(MainIntervalHandler, $this.settings.interval);
			}
		};

		$this.Stop = function() {
			if (intervaltimer)
			{
				clearInterval(intervaltimer);

				intervaltimer = null;
			}
		};

		$this.Destroy = function() {
			$this.Stop();

			$this = null;
		}
	};


	// FlexForms Designer class.  Tranforms objects into DOM nodes similar to what the PHP version generates.
	var nextform = 1;
	var DesignerInternal = function() {
		if (!(this instanceof DesignerInternal))  return new DesignerInternal();

		var triggers = {};
		var $this = this;

		$this.settings = {
			formidbase: 'ff_js_form_',
			responsive: true,
			formtables: true,
			formwidths: true,
			supporturl: (document.currentScript.src.lastIndexOf('/') > -1 ? document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf('/')) : document.currentScript.src),

			langmap: {}
		};

		// Multilingual translation.
		$this.Translate = function(str) {
			return ($this.settings.langmap[str] ? $this.settings.langmap[str] : str);
		};

		// Internal functions.
		var DispatchEvent = function(eventname, params) {
			if (!triggers[eventname])  return;

			triggers[eventname].forEach(function(callback) {
				if (Array.isArray(params))  callback.apply($this, params);
				else  callback.call($this, params);
			});
		};

		// Public DOM-style functions.
		$this.addEventListener = function(eventname, callback) {
			if (!triggers[eventname])  triggers[eventname] = [];

			for (var x in triggers[eventname])
			{
				if (triggers[eventname][x] === callback)  return;
			}

			triggers[eventname].push(callback);
		};

		$this.removeEventListener = function(eventname, callback) {
			if (!triggers[eventname])  return;

			for (var x in triggers[eventname])
			{
				if (triggers[eventname][x] === callback)
				{
					triggers[eventname].splice(x, 1);

					return;
				}
			}
		};

		$this.hasEventListener = function(eventname) {
			return (triggers[eventname] && triggers[eventname].length);
		};

		$this.OutputFormCSS = function() {
			FlexForms.LoadCSS('formcss', $this.settings.supporturl + '/flex_forms.css');
		};

		// Creates a message for insertion into the DOM.
		$this.CreateMessage = function(type, message) {
			type = type.toLowerCase();
			if (type === 'warn')  type = 'warning';

			var messagewrap = CreateNode('div', ['ff_formmessagewrap']);
			var messagewrapinner = CreateNode('div', ['ff_formmessagewrapinner']);
			var messagenode = CreateNode('div', ['message', 'message' + EscapeHTML(type)]);

			messagenode.innerHTML = $this.Translate(message);

			messagewrapinner.appendChild(messagenode);
			messagewrap.appendChild(messagewrapinner);

			return messagewrap;
		};

		// Creates a Javascript object from submitted form elements for client-side use (e.g. validation).
		$this.GetFormVars = function(formelem, e) {
			if (e && !e.isTrusted)  return null;

			var result = {};

			for (var x = 0; x < formelem.elements.length; x++)
			{
				var elem = formelem.elements[x];
				var type = (elem.tagName === 'INPUT' || elem.tagName === 'BUTTON' ? elem.type.toLowerCase() : '');

				if (!elem.name || elem.disabled)  continue;
				if (elem.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio') && !elem.checked)  continue;
				if ((elem.tagName === 'INPUT' || elem.tagName === 'BUTTON') && (type === 'reset' || type === 'button' || ((type === 'submit' || type === 'image' || elem.tagName === 'BUTTON') && (!e || !e.submitter || e.submitter !== elem))))  continue;

				var multi = elem.name.endsWith('[]');
				var name = (multi ? elem.name.substring(0, elem.name.length - 2) : elem.name);
				if (!multi && elem.multiple)  multi = true;

				if (multi && (!result.hasOwnProperty(name) || !Array.isArray(result[name])))  result[name] = [];

				if (elem.tagName === 'INPUT' && type === 'file')
				{
					if (elem.files)  result[name] = (multi ? elem.files : (elem.files.length ? elem.files[0] : null));
				}
				else if (elem.tagName === 'SELECT')
				{
					for (var x2 = 0; x2 < elem.options.length; x2++)
					{
						if (elem.options[x2].selected)
						{
							if (multi)  result[name].push(elem.options[x2].value);
							else  result[name] = elem.options[x2].value;
						}
					}
				}
				else if (multi)  result[name].push(elem.value);
				else  result[name] = elem.value;
			}

			return result;
		};

		// Generates and injects HTML, CSS, and Javascript into the DOM.  Has feature parity with PHP FlexForms.
		$this.Generate = function(parentelem, options, errors, request) {
			var state = {
				formnum: nextform,
				formid: $this.settings.formidbase + nextform,
				customfieldtypes: {},
				hidden: {},
				insiderow: false,
				firstitem: false,
				html: '',
				css: {},
				js: {},
				request: {}
			};

			if (request)  state.request = request;

			nextform++;

			// Deep clone the options.
			options = JSON.parse(JSON.stringify(options));

			// Let form handlers modify the options and state.
			DispatchEvent('init', [state, options]);

			$this.OutputFormCSS();

			if (options.submit || options.useform)
			{
				state.html += '<form class="ff_form" id="' + state.formid + '"' + (options.formmode && options.formmode === 'get' ? ' method="get"' : ' method="post" enctype="multipart/form-data"') + '>';

				if (options.hidden)
				{
					for (var x in options.hidden)
					{
						if (options.hidden.hasOwnProperty(x))  state.html += '<input type="hidden" name="' + EscapeHTML(x) + '" value="' + EscapeHTML(options.hidden[x]) + '" />';
					}
				}
			}

			if (Array.isArray(options.fields))
			{
				state.html += '<div class="formfields' + (options.fields.length === 1 && !options.fields[0]['title'] && !options.fields[0]['htmltitle'] ? ' alt' : '') + ($this.settings.responsive ? ' formfieldsresponsive' : '') + '">';
				state.html += '<div class="formfieldsinner">';

				for (var x = 0; x < options.fields.length; x++)
				{
					var id = 'f_js' + state.formnum + '_' + x;

					if (typeof options.fields[x] !== 'string' && options.fields[x].name)
					{
						id += '_' + options.fields[x].name;

						if (errors && errors[options.fields[x].name])  options.fields[x].error = errors[options.fields[x].name];
					}

					ProcessField(state, x, options.fields[x], id);
				}

				// Cleanup fields.
				if (state.insiderow)
				{
					if ($this.settings.responsive && state.insiderowwidth)  state.html += '<td></td>';

					state.html += '</tr></tbody></table></div>';
				}

				// Let form handlers process other field types.
				DispatchEvent('cleanup', state);

				state.html += '</div>';
				state.html += '</div>';
			}

			// Process submit button(s).
			if (options.submit)
			{
				if (typeof options.submit === 'string')  options.submit = [{ name: (options.submitname ? options.submitname : ''), value: options.submit }];

				state.html += '<div class="formsubmit">';
				state.html += '<div class="formsubmitinner">';

				if (Array.isArray(options.submit))
				{
					for (var x = 0; x < options.submit.length; x++)
					{
						if (typeof options.submit[x] === 'string')  options.submit[x] = { value: options.submit[x] };
						if (!options.submit[x].name)  options.submit[x].name = (options.submitname ? options.submitname : '');

						state.html += '<input class="submit" type="submit"' + (options.submit[x].name !== '' ? ' name="' + EscapeHTML(options.submit[x].name) + '"' : '') + ' value="' + EscapeHTML($this.Translate(options.submit[x].value)) + '" />';
					}
				}

				state.html += '</div>';
				state.html += '</div>';
			}

			if (options.submit || options.useform)
			{
				state.html += '</form>';
			}

			var formwrap = CreateNode('div', ['ff_formwrap']);
			var formwrapinner = CreateNode('div', ['ff_formwrapinner']);

			formwrapinner.innerHTML = state.html;
			formwrap.appendChild(formwrapinner);

			parentelem.appendChild(formwrap);

			// Load CSS in dependency order.
			do
			{
				var found = false;

				for (var x in state.css)
				{
					if (state.css.hasOwnProperty(x) && state.css[x].mode === 'link' && (state.css[x].dependency === false || !state.css.hasOwnProperty(state.css[x].dependency)))
					{
						FlexForms.LoadCSS(x, state.css[x].src, (state.css[x].media ? state.css[x].media : null));

						delete state.css[x];

						found = true;
					}
				}
			} while (found);

			// Add inline CSS.
			for (var x in state.css)
			{
				if (state.css.hasOwnProperty(x) && state.css[x].mode === 'inline')  FlexForms.AddCSS(x, state.css[x].src, (state.css[x].media ? state.css[x].media : null));
			}

			// Queue Javascript dependencies.
			for (var x in state.js)
			{
				if (state.js.hasOwnProperty(x))  FlexForms.AddJSQueueItem(x, state.js[x]);
			}

			// Let form handlers finalize other field types.
			DispatchEvent('finalize', state);

			// Focus on an autofocus element.
			var focusnode = formwrap.querySelector('[autofocus]');
			if (focusnode)
			{
				focusnode.focus();
				focusnode.select();
			}

			return formwrap;
		};

		$this.GetSelectValues = function(data) {
			var result = {};
			for (var x = 0; x < data.length; x++)  result[data[x]] = true;

			return result;
		};

		$this.IsEmptyObject = function(obj) {
			for (var x in obj)
			{
				if (obj.hasOwnProperty(x))  return false;
			}

			return true;
		};

		var ProcessField = function(state, num, field, id) {
			if (typeof field === 'string')
			{
				if (field === 'split' && !state.insiderow)  state.html += '<hr />';
				else if (field === 'startrow')
				{
					if (state.insiderow)
					{
						if ($this.settings.responsive && state.insiderowwidth)  state.html += '<td></td>';

						state.html += '</tr><tr>';
					}
					else if ($this.settings.formtables)
					{
						state.insiderow = true;
						state.insiderowwidth = false;
						state.html += '<div class="fieldtablewrap' + (state.firstitem ? ' firstitem' : '') + '"><table class="rowwrap"><tbody><tr>';
						state.firstitem = false;
					}
				}
				else if (field === 'endrow' && $this.settings.formtables && state.insiderow)
				{
					if ($this.settings.responsive && state.insiderowwidth)  state.html += '<td></td>';

					state.html += '</tr></tbody></table></div>';

					state.insiderow = false;
				}
				else if (field.startsWith('html:'))
				{
					state.html += field.substring(5);
				}

				// Let form handlers process strings.
				DispatchEvent('field_string', [state, num, field, id]);
			}
			else if (!field.type || (field.hasOwnProperty('use') && !field.use))
			{
				// Do nothing if type is not specified.
			}
			else if (field.type === 'hidden')
			{
				state.html += '<input type="hidden" id="' + EscapeHTML(id) + '" name="' + EscapeHTML(field.name) + '" value="' + EscapeHTML(field.value) + '" /></div>';
			}
			else if (state.customfieldtypes.hasOwnProperty(field.type))
			{
				// Output custom fields.
				DispatchEvent('field_type', [state, num, field, id]);
			}
			else
			{
				if (state.insiderow)
				{
					if (!$this.settings.responsive || !field.hasOwnProperty('width'))  state.html += '<td>';
					else
					{
						state.html += '<td style="width: ' + EscapeHTML(field.width) + ';">';

						state.insiderowwidth = true;
					}
				}

				state.html += '<div class="formitem' + (field.split === false || state.firstitem ? ' firstitem' : '') + '">';

				state.firstitem = false;

				if (field.title)
				{
					if (typeof field.title === 'string')  state.html += '<div class="formitemtitle">' + EscapeHTML($this.Translate(field.title)) + '</div>';
				}
				else if (field.htmltitle)
				{
					state.html += '<div class="formitemtitle">' + $this.Translate(field.htmltitle) + '</div>';
				}
				else if (field.type === 'checkbox' && state.insiderow)
				{
					state.html += '<div class="formitemtitle">&nbsp;</div>';
				}

				if (field.hasOwnProperty('width') && !$this.settings.formwidths)  delete field.width;

				if (field.hasOwnProperty('name') && field.hasOwnProperty('default'))
				{
					if (field.type === 'select')
					{
						if (!field.select)
						{
							field.select = (state.request[field.name] ? state.request[field.name] : field.default);
							if (Array.isArray(field.select))  field.select = $this.GetSelectValues(field.select);
						}
					}
					else if (field.type === 'checkbox')
					{
						if (!field.hasOwnProperty('check') && field.hasOwnProperty('value'))  field.check = (state.request[field.name] === field.value ? true : ($this.IsEmptyObject(state.request) ? field.default : false));
					}
					else if (!field.hasOwnProperty('value'))
					{
						field.value = (state.request[field.name] ? state.request[field.name] : field.default);
					}
				}

				if (field.type === 'select' && field.hasOwnProperty('mode') && field.mode === 'formhandler')  delete field.mode;

				// Let form handlers process fields.
				DispatchEvent('field_type', [state, num, field, id]);

				switch (field.type)
				{
					case 'static':
					{
						state.html += '<div class="formitemdata">';
						state.html += '<div class="staticwrap"' + (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '') + '>' + EscapeHTML(field.value) + '</div>';
						state.html += '</div>';

						break;
					}
					case 'text':
					case 'password':
					{
						state.html += '<div class="formitemdata">';
						state.html += '<div class="textitemwrap"' + (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '') + '><input class="text" type="' + EscapeHTML(field.hasOwnProperty('subtype') ? field.subtype : field.type) + '" id="' + EscapeHTML(id) + '" name="' + EscapeHTML(field.name) + '" value="' + EscapeHTML(field.value) + '"' + (field.focus ? ' autofocus' : '') + ' /></div>';
						state.html += '</div>';

						break;
					}
					case 'checkbox':
					{
						state.html += '<div class="formitemdata">';
						state.html += '<div class="checkboxitemwrap"' + (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '') + '>';
						state.html += '<input class="checkbox" type="checkbox" id="' + EscapeHTML(id) + '" name="' + EscapeHTML(field.name) + '" value="' + EscapeHTML(field.value) + '"' + (field.check ? ' checked' : '') + (field.focus ? ' autofocus' : '') + ' />';
						state.html += ' <label for="' + EscapeHTML(id) + '">' + EscapeHTML($this.Translate(field.display)) + '</label>';
						state.html += '</div>';
						state.html += '</div>';

						break;
					}
					case 'select':
					{
						var mode, stylewidth, styleheight, idbase;

						if (!field.multiple)  mode = (field.mode === 'radio' ? 'radio' : 'select');
						else if (!field.hasOwnProperty('mode') || (field.mode != 'formhandler' && field.mode != 'select'))  mode = 'checkbox';
						else  mode = field.mode;

						mode = EscapeHTML(mode);

						stylewidth = (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '');
						styleheight = (field.hasOwnProperty('height') ? ' style="height: ' + EscapeHTML(field.height) + ';"' : '');

						if (!field.hasOwnProperty('select'))  field.select = {};
						else if (typeof field.select === 'string')
						{
							var tempselect = {};

							tempselect[field.select] = true;

							field.select = tempselect;
						}

						state.html += '<div class="formitemdata">';

						idbase = EscapeHTML(id);
						if (mode === 'checkbox' || mode === 'radio')
						{
							var idnum = 0;

							for (var x = 0; x < field.options.length; x ++)
							{
								// Fix confusing legacy name/value keys.
								if (field.options[x].name && field.options[x].value)
								{
									if (Array.isArray(field.options[x].value))
									{
										field.options[x].display = field.options[x].key;
										field.options[x].values = field.options[x].value;
									}
									else
									{
										field.options[x].key = field.options[x].name;
										field.options[x].display = field.options[x].value;
									}
								}

								var display = field.options[x].display;

								if (field.options[x].values && Array.isArray(field.options[x].values))
								{
									for (var x2 = 0; x2 < field.options[x].values.length; x2++)
									{
										// Fix confusing legacy name/value keys.
										if (field.options[x].values[x2].name && field.options[x].values[x2].value)
										{
											field.options[x].values[x2].key = field.options[x].values[x2].name;
											field.options[x].values[x2].display = field.options[x].values[x2].value;
										}

										var key2 = field.options[x].values[x2].key;
										var display2 = field.options[x].values[x2].display;
										var id2 = EscapeHTML(idbase + (idnum ? '_' + idnum : ''));

										state.html += '<div class="' + mode + 'itemwrap"' + stylewidth + '>';
										state.html += '<input class="' + mode + '" type="' + mode + '" id="' + id2 + '" name="' + EscapeHTML(field.name + (mode === 'checkbox' ? '[]' : '')) + '" value="' + EscapeHTML(key2) + '"' + (field.select.hasOwnProperty(key2) ? ' checked' : '') + (field.focus ? ' autofocus' : '') + ' />';
										state.html += ' <label for="' + id2 + '">' + EscapeHTML($this.Translate(display)) + ' - ' + (display2 == '' ? '&nbsp;' : EscapeHTML($this.Translate(display2))) + '</label>';
										state.html += '</div>';

										idnum++;
									}
								}
								else
								{
									var key = field.options[x].key;
									var id2 = EscapeHTML(idbase + (idnum ? '_' + idnum : ''));

									state.html += '<div class="' + mode + 'itemwrap"' + stylewidth + '>';
									state.html += '<input class="' + mode + '" type="' + mode + '" id="' + id2 + '" name="' + EscapeHTML(field.name + (mode === 'checkbox' ? '[]' : '')) + '" value="' + EscapeHTML(key) + '"' + (field.select.hasOwnProperty(key) ? ' checked' : '') + (field.focus ? ' autofocus' : '') + ' />';
									state.html += ' <label for="' + id2 + '">' + (display == '' ? '&nbsp;' : EscapeHTML($this.Translate(display))) + '</label>';
									state.html += '</div>';

									idnum++;
								}
							}
						}
						else
						{
							state.html += '<div class="selectitemwrap"' + stylewidth + '>';
							state.html += '<select class="' + (field.multiple ? 'multi' : 'single') + '" id="' + EscapeHTML(idbase) + '" name="' + EscapeHTML(field.name + (field.multiple ? '[]' : '')) + '"' + (field.multiple ? ' multiple' : '') + styleheight + (field.focus ? ' autofocus' : '') + '>';

							for (var x = 0; x < field.options.length; x ++)
							{
								// Fix confusing legacy name/value keys.
								if (field.options[x].name && field.options[x].value)
								{
									if (Array.isArray(field.options[x].value))
									{
										field.options[x].display = field.options[x].key;
										field.options[x].values = field.options[x].value;
									}
									else
									{
										field.options[x].key = field.options[x].name;
										field.options[x].display = field.options[x].value;
									}
								}

								var display = field.options[x].display;

								if (field.options[x].values && Array.isArray(field.options[x].values))
								{
									state.html += '<optgroup label="' + EscapeHTML($this.Translate(display)) + '">';

									for (var x2 = 0; x2 < field.options[x].values.length; x2++)
									{
										// Fix confusing legacy name/value keys.
										if (field.options[x].values[x2].name && field.options[x].values[x2].value)
										{
											field.options[x].values[x2].key = field.options[x].values[x2].name;
											field.options[x].values[x2].display = field.options[x].values[x2].value;
										}

										var key2 = field.options[x].values[x2].key;
										var display2 = field.options[x].values[x2].display;

										state.html += '<option value="' + EscapeHTML(key2) + '"' + (field.select.hasOwnProperty(key2) ? ' selected' : '') + '>' + (display2 == '' ? '&nbsp;' : EscapeHTML($this.Translate(display2))) + '</option>';
									}

									state.html += '</optgroup>';
								}
								else
								{
									var key = field.options[x].key;

									state.html += '<option value="' + EscapeHTML(key) + '"' + (field.select.hasOwnProperty(key) ? ' selected' : '') + '>' + (display == '' ? '&nbsp;' : EscapeHTML($this.Translate(display))) + '</option>';
								}
							}

							state.html += '</select>';
							state.html += '</div>';
						}

						state.html += '</div>';

						break;
					}
					case 'textarea':
					{
						var stylewidth, styleheight;

						stylewidth = (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '');
						styleheight = (field.hasOwnProperty('height') ? ' style="height: ' + EscapeHTML(field.height) + ';"' : '');

						state.html += '<div class="formitemdata">';
						state.html += '<div class="textareawrap"' + stylewidth + '><textarea class="text"' + styleheight + ' id="' + EscapeHTML(id) + '" name="' + EscapeHTML(field.name) + '" rows="5" cols="50"' + (field.focus ? ' autofocus' : '') + '>' + EscapeHTML(field.value) + '</textarea></div>';
						state.html += '</div>';

						break;
					}
					case 'table':
					{
						idbase = id + '_table';

						state.html += '<div class="formitemdata">';

						if ($this.settings.formtables)
						{
							state.html += '<table id="' + EscapeHTML(idbase) + '" class="formitemtable' + (field.hasOwnProperty('class') ? ' ' + EscapeHTML(field.class) : '') + '"' + (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '') + '>';
							state.html += '<thead>';

							var trattrs = { class: 'head' }, colattrs = [];
							if (!field.hasOwnProperty('cols'))  field.cols = [];
							for (var x = 0; x < field.cols.length; x++)  colattrs.push({});

							// Let form handlers process the columns.
							DispatchEvent('table_row', [state, num, field, idbase, 'head', -1, trattrs, colattrs, field.cols]);

							state.html += '<tr';
							for (var x in trattrs)
							{
								if (trattrs.hasOwnProperty(x))  state.html += ' ' + EscapeHTML(x) + '="' + EscapeHTML(trattrs[x]) + '"';
							}
							state.html += '>';

							for (var x = 0; x < field.cols.length; x++)
							{
								state.html += '<th';
								for (var x2 in colattrs[x])
								{
									if (colattrs[x].hasOwnProperty(x2))  state.html += ' ' + EscapeHTML(x2) + '="' + EscapeHTML(colattrs[x][x2]) + '"';
								}
								state.html += '>' + (field.htmlcols ? field.cols[x] : EscapeHTML(field.cols[x])) + '</th>';
							}

							state.html += '</tr></thead>';
							state.html += '<tbody>';

							colattrs = [];
							for (var x = 0; x < field.cols.length; x++)  colattrs.push(field.hasOwnProperty('nowrap') && ((typeof field.nowrap === 'string' && field.cols[x] === field.nowrap) || (Array.isArray(field.nowrap) && Array.indexOf(field.cols[x]) > -1)) ? { class: 'nowrap' } : {});

							var rownum = 0, altrow = false, colattrs2, num2;
							if (field.callback)  field.rows = field.callback.call($this, field);
							while (field.rows.length)
							{
								for (var y = 0; y < field.rows.length; y++)
								{
									trattrs = { class: 'row' + (altrow ? ' altrow' : '') };
									colattrs2 = colattrs.slice();

									// Let form handlers process the current row.
									DispatchEvent('table_row', [state, num, field, idbase, 'body', rownum, trattrs, colattrs2, field.rows[y]]);

									if (field.rows[y].length < colattrs2.length)  colattrs2[field.rows[y].length - 1].colspan = colattrs2.length - field.rows[y].length + 1;

									state.html += '<tr';
									for (var x in trattrs)
									{
										if (trattrs.hasOwnProperty(x))  state.html += ' ' + EscapeHTML(x) + '="' + EscapeHTML(trattrs[x]) + '"';
									}
									state.html += '>';

									num2 = 0;
									for (var x = 0; x < field.rows[y].length; x++)
									{
										state.html += '<td';
										if (colattrs2.length > num2)
										{
											for (var x2 in colattrs2[num2])
											{
												if (colattrs2[num2].hasOwnProperty(x2))  state.html += ' ' + EscapeHTML(x2) + '="' + EscapeHTML(colattrs2[num2][x2]) + '"';
											}
										}
										state.html += '>' + field.rows[y][x] + '</td>';

										num2++;
									}

									state.html += '</tr>';
									rownum++;
									altrow = !altrow;
								}

								if (field.callback)  field.rows = field.callback.call($this, field);
								else  field.rows = [];
							}

							state.html += '</tbody>';
							state.html += '</table>';
						}
						else
						{
							state.html += '<div class="nontablewrap" id="' + EscapeHTML(idbase) + '"' + (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '') + '>';

							var trattrs = { class: 'head' }, headcolattrs = [], colattrs = [];
							if (!field.hasOwnProperty('cols'))  field.cols = [];
							for (var x = 0; x < field.cols.length; x++)  headcolattrs.push({ class: 'nontable_th' + (x ? '' : ' firstcol') });

							// Let form handlers process the columns.
							DispatchEvent('table_row', [state, num, field, idbase, 'head', -1, trattrs, headcolattrs, field.cols]);

							for (var x = 0; x < field.cols.length; x++)  headcolattrs.push({ class: 'nontable_td' });

							var rownum = 0, altrow = false, colattrs2, num2;
							if (field.callback)  field.rows = field.callback.call($this, field);
							while (field.rows.length)
							{
								for (var y = 0; y < field.rows.length; y++)
								{
									trattrs = { class: 'nontable_row' + (altrow ? ' altrow' : '') + (rownum ? '' : ' firstrow') };
									colattrs2 = colattrs.slice();

									// Let form handlers process the current row.
									DispatchEvent('table_row', [state, num, field, idbase, 'body', rownum, trattrs, colattrs2, field.rows[y]]);

									state.html += '<div';
									for (var x in trattrs)
									{
										if (trattrs.hasOwnProperty(x))  state.html += ' ' + EscapeHTML(x) + '="' + EscapeHTML(trattrs[x]) + '"';
									}
									state.html += '>';

									num2 = 0;
									for (var x = 0; x < field.rows[y].length; x++)
									{
										state.html += '<div';
										if (headcolattrs.length > num2)
										{
											for (var x2 in headcolattrs[num2])
											{
												if (headcolattrs[num2].hasOwnProperty(x2))  state.html += ' ' + EscapeHTML(x2) + '="' + EscapeHTML(headcolattrs[num2][x2]) + '"';
											}
										}
										state.html += '>' + (field.cols.length > x ? (field.htmlcols ? field.cols[x] : EscapeHTML(field.cols[x])) : '') + '</div>';

										state.html += '<div';
										if (colattrs2.length > num2)
										{
											for (var x2 in colattrs2[num2])
											{
												if (colattrs2[num2].hasOwnProperty(x2))  state.html += ' ' + EscapeHTML(x2) + '="' + EscapeHTML(colattrs2[num2][x2]) + '"';
											}
										}
										state.html += '>' + field.rows[y][x] + '</div>';

										num2++;
									}

									state.html += '</div>';
									rownum++;
									altrow = !altrow;
								}
							}

							state.html += '</div>';
						}

						state.html += '</div>';

						break;
					}
					case 'file':
					{
						state.html += '<div class="formitemdata">';
						state.html += '<div class="textitemwrap"' + (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '') + '><input class="text" type="file" id="' + EscapeHTML(id) + '" name="' + EscapeHTML(field.name) + (field.multiple ? '[]' : '') + '"' + (field.multiple ? ' multiple' : '') + (typeof field.accept === 'string' ? ' accept="' + EscapeHTML(field.accept) + '"' : '') + (field.focus ? ' autofocus' : '') + ' /></div>';
						state.html += '</div>';

						break;
					}
					case 'custom':
					{
						state.html += '<div class="formitemdata">';
						state.html += '<div id="' + EscapeHTML(id) + '" class="customitemwrap"' + (field.hasOwnProperty('width') ? ' style="' + ($this.settings.responsive ? 'max-' : '') + 'width: ' + EscapeHTML(field.width) + ';"' : '') + '>';
						state.html += field.value;
						state.html += '</div>';
						state.html += '</div>';

						break;
					}
				}

				if (field.hasOwnProperty('desc') && field.desc != '')
				{
					state.html += '<div class="formitemdesc">' + EscapeHTML($this.Translate(field.desc)) + '</div>';
				}
				else if (field.hasOwnProperty('htmldesc') && field.htmldesc != '')
				{
					state.html += '<div class="formitemdesc">' + $this.Translate(field.htmldesc) + '</div>';
				}

				if (field.hasOwnProperty('error') && field.error != '')
				{
					state.html += '<div class="formitemresult">';
					state.html += '<div class="formitemerror">' + EscapeHTML($this.Translate(field.error)) + '</div>';
					state.html += '</div>';
				}

				state.html += '</div>';

				if (state.insiderow)  state.html += '</td>';
			}
		};
	};

	window.FlexForms.Designer = new DesignerInternal();

	// Merge down into FlexForms.
	window.FlexForms.settings = window.FlexForms.Designer.settings;
	window.FlexForms.EscapeHTML = EscapeHTML;
	window.FlexForms.FormatStr = FormatStr;
	window.FlexForms.CreateNode = CreateNode;
	window.FlexForms.DebounceAttributes = DebounceAttributes;

	for (var x in window.FlexForms.Designer)
	{
		if (window.FlexForms.Designer.hasOwnProperty(x) && typeof window.FlexForms.Designer[x] === 'function' && !window.FlexForms.hasOwnProperty(x))  window.FlexForms[x] = window.FlexForms.Designer[x];
	}
})();
