// FlexForms Javascript Dialog class.
// (C) 2022 CubicleSoft.  All Rights Reserved.

(function() {
	if (!window.hasOwnProperty('FlexForms') || !window.FlexForms.hasOwnProperty('Designer'))
	{
		console.error('[FlexForms.Dialog] Error:  FlexForms and FlexForms.Designer must be loaded before FlexForms.Dialog.');

		return;
	}

	if (window.FlexForms.hasOwnProperty('Dialog'))  return;

	var EscapeHTML = window.FlexForms.EscapeHTML;
	var FormatStr = window.FlexForms.FormatStr;
	var CreateNode = window.FlexForms.CreateNode;
	var DebounceAttributes = window.FlexForms.DebounceAttributes;
	var Translate = window.FlexForms.Translate;

	var DialogInternal = function(parentelem, options) {
		if (!(this instanceof DialogInternal))  return new DialogInternal(parentelem, options);

		var triggers = {};
		var $this = this;

		var defaults = {
			modal: true,
			backgroundcloses: false,
			move: true,
			resize: true,

			title: '',
			content: {},
			errors: {},
			request: {},

			onposition: null,
			onsubmit: null,
			onclose: null,
			ondestroy: null,

			langmap: {}
		};

		$this.settings = Object.assign({}, defaults, options);

		Object.assign(window.FlexForms.settings.langmap, $this.settings.langmap);

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

		// Register settings callbacks.
		if ($this.settings.onposition)  $this.addEventListener('position', $this.settings.onposition);
		if ($this.settings.onsubmit)  $this.addEventListener('submit', $this.settings.onsubmit);
		if ($this.settings.onclose)  $this.addEventListener('close', $this.settings.onclose);
		if ($this.settings.ondestroy)  $this.addEventListener('destroy', $this.settings.ondestroy);

		var elems = {
			mainwrap: CreateNode('div', ['ff_dialogwrap'], { tabIndex: 0 }, { position: 'fixed', left: '-9999px' }),
			resizer: CreateNode('div', ['ff_dialog_resizer']),
			measureemsize: CreateNode('div', ['ff_dialog_measure_em_size']),
			innerwrap: CreateNode('div', ['ff_dialog_innerwrap']),

			titlewrap: CreateNode('div', ['ff_dialog_titlewrap']),
			title: CreateNode('div', ['ff_dialog_title']),
			closebutton: CreateNode('button', ['ff_dialog_close'], { title: Translate('Close') }),

			overlay: CreateNode('div', ['ff_dialog_overlay']),

			formwrap: null
		};

		elems.title.innerHTML = EscapeHTML(Translate($this.settings.title));

		elems.titlewrap.appendChild(elems.title);
		if ($this.settings.onclose || $this.settings.backgroundcloses)  elems.titlewrap.appendChild(elems.closebutton);
		elems.innerwrap.appendChild(elems.titlewrap);

		if ($this.settings.resize)  elems.mainwrap.appendChild(elems.resizer);
		elems.mainwrap.appendChild(elems.measureemsize);
		elems.mainwrap.appendChild(elems.innerwrap);

		// Handle submit buttons.
		var SubmitHandler = function(e) {
			if (!e.isTrusted)  return;

			e.preventDefault();

			$this.settings.request = FlexForms.GetFormVars(elems.formnode, e);

			DispatchEvent('submit', [$this.settings.request, elems.formnode, e, lastactiveelem]);
		};

		// Useful helper function to return whether or not the errors object contains errors.
		$this.HasErrors = function() {
			return (Object.keys($this.settings.errors).length > 0);
		};

		// Regenerate and append the form.
		$this.UpdateContent = function() {
			if (elems.formwrap)  elems.formwrap.parentNode.removeChild(elems.formwrap);

			elems.formwrap = FlexForms.Generate(elems.innerwrap, $this.settings.content, $this.settings.errors, $this.settings.request);
			elems.formnode = elems.formwrap.querySelector('form');

			elems.formnode.addEventListener('submit', SubmitHandler);
		};

		if ($this.settings.modal)  parentelem.appendChild(elems.overlay);
		parentelem.appendChild(elems.mainwrap);

		$this.UpdateContent();

		// Returns the internal elements object for easier access to various elements.
		$this.GetElements = function() {
			return elems;
		};

		// Set up focusing rules.
		var lastactiveelem = document.activeElement;
		var hasfocus = false;

		var MainWrapMouseBlurHandler = function(e) {
			if (!e.isTrusted)  return;

			var node = e.target;
			while (node && node !== elems.mainwrap)  node = node.parentNode;

			if (node === elems.mainwrap)  elems.mainwrap.classList.add('ff_dialog_focused');
			else
			{
				if ($this.settings.modal)
				{
					hasfocus = false;

					e.preventDefault();

					elems.mainwrap.focus();
				}
				else
				{
					elems.mainwrap.classList.remove('ff_dialog_focused');

					if (hasfocus && $this.settings.backgroundcloses)
					{
						lastactiveelem = e.target;

						$this.Close();
					}

					hasfocus = false;
				}
			}
		};

		window.addEventListener('mousedown', MainWrapMouseBlurHandler, true);

		// Trigger window blur visual appearance changes.
		var MainWrapWindowBlurHandler = function(e) {
			if (e.target === window || e.target === document)  elems.mainwrap.classList.remove('ff_dialog_focused');
		};

		window.addEventListener('blur', MainWrapWindowBlurHandler, true);

		var MainWrapFocusHandler = function(e) {
			// Handle window-level focus events specially.  There will be another focus event if actually focused.
			if (!$this.settings.modal && (e.target === window || e.target === document))
			{
				var node = document.activeElement;
				while (node && node !== elems.mainwrap)  node = node.parentNode;

				if (node === elems.mainwrap)  elems.mainwrap.classList.add('ff_dialog_focused');

				return;
			}

			var node = e.target;
			while (node && node !== elems.mainwrap)  node = node.parentNode;

			if (node === elems.mainwrap)
			{
				elems.mainwrap.classList.add('ff_dialog_focused');

				// Move this dialog to the top of the stack.
				if (!hasfocus)
				{
					window.removeEventListener('focus', MainWrapFocusHandler, true);

					lastactiveelem.focus();

					parentelem.appendChild(elems.mainwrap);

					elems.mainwrap.focus();

					window.addEventListener('focus', MainWrapFocusHandler, true);
				}

				hasfocus = true;
			}
			else if ($this.settings.modal)
			{
				elems.mainwrap.focus();
			}
			else
			{
				elems.mainwrap.classList.remove('ff_dialog_focused');

				hasfocus = false;
			}
		};

		window.addEventListener('focus', MainWrapFocusHandler, true);

		// Some internal tracking variables to control dialog position and size.
		var manualsize = false, manualmove = false;
		var screenwidth, screenheight, currdialogstyle, dialogwidth, dialogheight;

		// Adjust the dialog and recalculate size information.
		$this.UpdateSizes = function() {
			elems.mainwrap.classList.remove('ff_dialogwrap_small');

			if (elems.mainwrap.offsetWidth / elems.measureemsize.offsetWidth < 27)  elems.mainwrap.classList.add('ff_dialogwrap_small');

			screenwidth = (document.documentElement.clientWidth || document.body.clientWidth || window.innerWidth);
			screenheight = (document.documentElement.clientHeight || document.body.clientHeight || window.innerHeight);

			if (!manualsize)  elems.mainwrap.style.height = null;

			currdialogstyle = elems.mainwrap.currentStyle || window.getComputedStyle(elems.mainwrap);
			dialogwidth = elems.mainwrap.offsetWidth + parseFloat(currdialogstyle.marginLeft) + parseFloat(currdialogstyle.marginRight);
			dialogheight = elems.mainwrap.offsetHeight + parseFloat(currdialogstyle.marginTop) + parseFloat(currdialogstyle.marginBottom);

			if (!manualsize && dialogheight >= screenheight)
			{
				elems.mainwrap.style.height = (screenheight - parseFloat(currdialogstyle.marginTop) - parseFloat(currdialogstyle.marginBottom) - 2) + 'px';

				dialogheight = screenheight;
			}
		};

		// Snaps the dialog so it fits on the screen.
		$this.SnapToScreen = function() {
			var currleft = elems.mainwrap.offsetLeft - parseFloat(currdialogstyle.marginLeft);
			var currtop = elems.mainwrap.offsetTop - parseFloat(currdialogstyle.marginTop);

			elems.mainwrap.style.left = '0px';
			elems.mainwrap.style.top = '0px';

			$this.UpdateSizes();

			if (currleft < 0)  currleft = 0;
			if (currtop < 0)  currtop = 0;
			if (currleft + dialogwidth >= screenwidth)  currleft = screenwidth - dialogwidth;
			if (currtop + dialogheight >= screenheight)  currtop = screenheight - dialogheight;

			elems.mainwrap.style.left = currleft + 'px';
			elems.mainwrap.style.top = currtop + 'px';
			elems.mainwrap.style.height = (dialogheight - parseFloat(currdialogstyle.marginTop) - parseFloat(currdialogstyle.marginBottom)) + 'px';

			DispatchEvent('position', elems.mainwrap);
		};

		// Move the dialog to the center of the screen unless it has been manually moved.
		$this.CenterDialog = function() {
			if (manualmove)  $this.SnapToScreen();
			else
			{
				$this.UpdateSizes();

				elems.mainwrap.style.left = ((screenwidth / 2) - (dialogwidth / 2)) + 'px';
				elems.mainwrap.style.top = ((screenheight / 2) - (dialogheight / 2)) + 'px';
				elems.mainwrap.style.height = (dialogheight - parseFloat(currdialogstyle.marginTop) - parseFloat(currdialogstyle.marginBottom)) + 'px';

				DispatchEvent('position', elems.mainwrap);
			}
		};

		// Set up an offsetWidth/offsetHeight attribute watcher that calls CenterDialog().
		var dialogresizewatch = new DebounceAttributes({
			watchers: [
				{ elem: elems.mainwrap, attr: 'offsetWidth', val: -1 },
				{ elem: elems.mainwrap, attr: 'offsetHeight', val: -1 }
			],
			interval: 50,
			stopsame: 5,
			callback: $this.CenterDialog,
			intervalcallback: $this.CenterDialog
		});

		window.addEventListener('resize', dialogresizewatch.Start, true);

		var LoadedHandler = function() {
			$this.CenterDialog();

			elems.mainwrap.classList.add('ff_dialog_focused');

			// Bypass the hasfocus checks in MainWrapFocusHandler.
			hasfocus = true;

			var node = document.activeElement;
			while (node && node !== elems.mainwrap)  node = node.parentNode;

			if (node !== elems.mainwrap)  elems.mainwrap.focus();
		};

		window.FlexForms.addEventListener('done', LoadedHandler);

		window.FlexForms.LoadCSS('formdialogcss', window.FlexForms.settings.supporturl + '/flex_forms_dialog.css');

		// Manual move.
		var moveanchorpos;
		var MoveDialogDragHandler = function(e) {
			if (!e.isTrusted)  return;

			// Prevent content selections.
			e.preventDefault();

			var newanchorpos;
			var rect = elems.title.getBoundingClientRect();

			if (e.type === 'touchstart')
			{
				newanchorpos = {
					x: e.touches[0].clientX - rect.left,
					y: e.touches[0].clientY - rect.top
				};
			}
			else
			{
				newanchorpos = {
					x: e.clientX - rect.left,
					y: e.clientY - rect.top
				};
			}

			var newleft = elems.mainwrap.offsetLeft - parseFloat(currdialogstyle.marginLeft) + newanchorpos.x - moveanchorpos.x;
			var newtop = elems.mainwrap.offsetTop - parseFloat(currdialogstyle.marginTop) + newanchorpos.y - moveanchorpos.y;

			if (newleft < 0)  newleft = 0;
			if (newtop < 0)  newtop = 0;
			if (newleft + dialogwidth >= screenwidth)  newleft = screenwidth - dialogwidth;
			if (newtop + dialogheight >= screenheight)  newtop = screenheight - dialogheight;

			elems.mainwrap.style.left = newleft + 'px';
			elems.mainwrap.style.top = newtop + 'px';

			manualmove = true;

			DispatchEvent('position', elems.mainwrap);
		};

		var MoveDialogEndHandler = function(e) {
			if (e && !e.isTrusted)  return;

			moveanchorpos = null;

			window.removeEventListener('touchmove', MoveDialogDragHandler, true);
			window.removeEventListener('touchend', MoveDialogEndHandler, true);
			window.removeEventListener('mousemove', MoveDialogDragHandler, true);
			window.removeEventListener('mouseup', MoveDialogEndHandler, true);
			window.removeEventListener('blur', MoveDialogEndHandler, true);
		};

		var StartMoveDialogHandler = function(e) {
			if (!e.isTrusted)  return;

			// Disallow scrolling on touch and block drag-and-drop.
			e.preventDefault();

			$this.CenterDialog();

			var rect = elems.title.getBoundingClientRect();

			if (e.type === 'touchstart')
			{
				moveanchorpos = {
					x: e.touches[0].clientX - rect.left,
					y: e.touches[0].clientY - rect.top
				};

				window.addEventListener('touchmove', MoveDialogDragHandler, true);
				window.addEventListener('touchend', MoveDialogEndHandler, true);
			}
			else
			{
				moveanchorpos = {
					x: e.clientX - rect.left,
					y: e.clientY - rect.top
				};

				window.addEventListener('mousemove', MoveDialogDragHandler, true);
				window.addEventListener('mouseup', MoveDialogEndHandler, true);
			}

			window.addEventListener('blur', MoveDialogEndHandler, true);
		};

		elems.title.addEventListener('mousedown', StartMoveDialogHandler);
		elems.title.addEventListener('touchstart', StartMoveDialogHandler);

		// Manual resize.
		var resizeclass, resizelocation, resizeanchorpos;
		var UpdateResizeHoverClass = function(e) {
			if (!e.isTrusted || resizeanchorpos)  return;

			var rect = elems.mainwrap.getBoundingClientRect();
			var currpos, newresizeclass;

			if (e.type === 'touchstart')
			{
				currpos = {
					x: e.touches[0].clientX,
					y: e.touches[0].clientY
				};
			}
			else
			{
				currpos = {
					x: e.clientX,
					y: e.clientY
				};
			}

			if (currpos.y < rect.top + elems.measureemsize.offsetWidth)
			{
				if (currpos.x < rect.left + elems.measureemsize.offsetWidth)  { newresizeclass = 'ff_dialog_resize_nwse'; resizelocation = 1; }
				else if (currpos.x >= rect.right - elems.measureemsize.offsetWidth)  { newresizeclass = 'ff_dialog_resize_nesw'; resizelocation = 3; }
				else  { newresizeclass = 'ff_dialog_resize_ns'; resizelocation = 2; }
			}
			else if (currpos.y >= rect.bottom - elems.measureemsize.offsetWidth)
			{
				if (currpos.x < rect.left + elems.measureemsize.offsetWidth)  { newresizeclass = 'ff_dialog_resize_nesw'; resizelocation = 6; }
				else if (currpos.x >= rect.right - elems.measureemsize.offsetWidth)  { newresizeclass = 'ff_dialog_resize_nwse'; resizelocation = 8; }
				else  { newresizeclass = 'ff_dialog_resize_ns'; resizelocation = 7; }
			}
			else
			{
				if (currpos.x < rect.left)  { newresizeclass = 'ff_dialog_resize_ew'; resizelocation = 4; }
				else  { newresizeclass = 'ff_dialog_resize_ew'; resizelocation = 5; }
			}

			if (newresizeclass !== resizeclass)
			{
				elems.resizer.className = 'ff_dialog_resizer ' + newresizeclass;

				resizeclass = newresizeclass;
			}
		};

		elems.resizer.addEventListener('mousemove', UpdateResizeHoverClass);

		var ResizeDialogDragHandler = function(e) {
			if (!e.isTrusted)  return;

			// Prevent content selections.
			e.preventDefault();

			var newanchorpos;
			var rect = elems.resizer.getBoundingClientRect();

			if (e.type === 'touchstart')
			{
				newanchorpos = {
					x: e.touches[0].clientX - rect.left,
					y: e.touches[0].clientY - rect.top
				};
			}
			else
			{
				newanchorpos = {
					x: e.clientX - rect.left,
					y: e.clientY - rect.top
				};
			}

			var newleft = elems.mainwrap.offsetLeft - parseFloat(currdialogstyle.marginLeft);
			var newtop = elems.mainwrap.offsetTop - parseFloat(currdialogstyle.marginTop);
			var newwidth = elems.mainwrap.offsetWidth;
			var newheight = elems.mainwrap.offsetHeight;
			var diffx = newanchorpos.x - resizeanchorpos.x;
			var diffy = newanchorpos.y - resizeanchorpos.y;

			// 1 2 3
			// 4   5
			// 6 7 8
			if (resizelocation === 1 || resizelocation === 4 || resizelocation === 6)
			{
				if (newwidth - diffx >= parseFloat(currdialogstyle.maxWidth))  diffx = newwidth - parseFloat(currdialogstyle.maxWidth);
				else if (newleft + diffx < 0)  diffx = -newleft;
				else if (newwidth - diffx < parseFloat(currdialogstyle.minWidth))  diffx = newwidth - parseFloat(currdialogstyle.minWidth);

				newleft += diffx;
				newwidth -= diffx;
			}

			if (resizelocation === 3 || resizelocation === 5 || resizelocation === 8)
			{
				if (resizeanchorpos.width + diffx >= parseFloat(currdialogstyle.maxWidth))  diffx = parseFloat(currdialogstyle.maxWidth) - resizeanchorpos.width;
				else if (newleft + resizeanchorpos.width + parseFloat(currdialogstyle.marginLeft) + parseFloat(currdialogstyle.marginRight) + diffx >= screenwidth)  diffx = screenwidth - newleft - resizeanchorpos.width - parseFloat(currdialogstyle.marginLeft) - parseFloat(currdialogstyle.marginRight);
				else if (resizeanchorpos.width + diffx < parseFloat(currdialogstyle.minWidth))  diffx = parseFloat(currdialogstyle.minWidth) - resizeanchorpos.width;

				newwidth = resizeanchorpos.width + diffx;
			}

			if (resizelocation === 1 || resizelocation === 2 || resizelocation === 3)
			{
				if (newheight - diffy >= parseFloat(currdialogstyle.maxHeight))  diffy = newheight - parseFloat(currdialogstyle.maxHeight);
				else if (newtop + diffy < 0)  diffy = -newtop;
				else if (newheight - diffy < parseFloat(currdialogstyle.minHeight))  diffy = newheight - parseFloat(currdialogstyle.minHeight);

				newtop += diffy;
				newheight -= diffy;
			}

			if (resizelocation === 6 || resizelocation === 7 || resizelocation === 8)
			{
				if (resizeanchorpos.height + diffy >= parseFloat(currdialogstyle.maxHeight))  diffx = parseFloat(currdialogstyle.maxHeight) - resizeanchorpos.height;
				else if (newtop + resizeanchorpos.height + parseFloat(currdialogstyle.marginTop) + parseFloat(currdialogstyle.marginBottom) + diffy >= screenheight)  diffy = screenheight - newtop - resizeanchorpos.height - parseFloat(currdialogstyle.marginTop) - parseFloat(currdialogstyle.marginBottom);
				else if (resizeanchorpos.height + diffy < parseFloat(currdialogstyle.minHeight))  diffy = parseFloat(currdialogstyle.minHeight) - resizeanchorpos.height;

				newheight = resizeanchorpos.height + diffy;
			}

			elems.mainwrap.style.left = newleft + 'px';
			elems.mainwrap.style.top = newtop + 'px';
			elems.mainwrap.style.width = newwidth + 'px';
			elems.mainwrap.style.height = newheight + 'px';

			manualmove = true;
			manualsize = true;

			DispatchEvent('position', elems.mainwrap);
		};

		var ResizeDialogEndHandler = function(e) {
			if (e && !e.isTrusted)  return;

			resizeanchorpos = null;

			document.body.classList.remove(resizeclass);

			window.removeEventListener('touchmove', ResizeDialogDragHandler, true);
			window.removeEventListener('touchend', ResizeDialogEndHandler, true);
			window.removeEventListener('mousemove', ResizeDialogDragHandler, true);
			window.removeEventListener('mouseup', ResizeDialogEndHandler, true);
			window.removeEventListener('blur', ResizeDialogEndHandler, true);

			$this.SnapToScreen();
		};

		var StartResizeDialogHandler = function(e) {
			if (!e.isTrusted)  return;

			// Disallow scrolling on touch and block drag-and-drop.
			e.preventDefault();

			$this.CenterDialog();

			UpdateResizeHoverClass(e);

			document.body.classList.add(resizeclass);

			var rect = elems.resizer.getBoundingClientRect();

			if (e.type === 'touchstart')
			{
				resizeanchorpos = {
					x: e.touches[0].clientX - rect.left,
					y: e.touches[0].clientY - rect.top
				};

				window.addEventListener('touchmove', ResizeDialogDragHandler, true);
				window.addEventListener('touchend', ResizeDialogEndHandler, true);
			}
			else
			{
				resizeanchorpos = {
					x: e.clientX - rect.left,
					y: e.clientY - rect.top
				};

				window.addEventListener('mousemove', ResizeDialogDragHandler, true);
				window.addEventListener('mouseup', ResizeDialogEndHandler, true);
			}

			resizeanchorpos.width = elems.mainwrap.offsetWidth;
			resizeanchorpos.height = elems.mainwrap.offsetHeight;

			window.addEventListener('blur', ResizeDialogEndHandler, true);
		};

		elems.resizer.addEventListener('touchstart', StartResizeDialogHandler);
		elems.resizer.addEventListener('mousedown', StartResizeDialogHandler);

		// Call close callbacks for the dialog.
		$this.Close = function(e) {
			if (e && !e.isTrusted)  return;

			DispatchEvent('close', lastactiveelem);
		};

		elems.closebutton.addEventListener('click', $this.Close);

		var MainKeyHandler = function(e) {
			if (e.keyCode == 27)  $this.Close(e);

			if (e.keyCode == 13 && e.target === elems.mainwrap)
			{
				// Locate the first button.
				var buttonnode = elems.formnode.querySelector('input[type=submit]');

				if (buttonnode)
				{
					var tempevent = {
						isTrusted: true,
						target: elems.formnode,
						submitter: buttonnode
					};

					$this.settings.request = FlexForms.GetFormVars(elems.formnode, tempevent);

					DispatchEvent('submit', [$this.settings.request, elems.formnode, tempevent, lastactiveelem]);
				}
			}
		};

		elems.mainwrap.addEventListener('keydown', MainKeyHandler);

		// Destroy this instance.
		$this.Destroy = function() {
			DispatchEvent('destroy');

			triggers = {};

			window.removeEventListener('mousedown', MainWrapMouseBlurHandler, true);
			window.removeEventListener('blur', MainWrapWindowBlurHandler, true);
			window.removeEventListener('focus', MainWrapFocusHandler, true);

			window.removeEventListener('resize', dialogresizewatch.Start, true);

			dialogresizewatch.Destroy();

			window.FlexForms.removeEventListener('done', LoadedHandler);

			MoveDialogEndHandler();

			elems.title.removeEventListener('mousedown', StartMoveDialogHandler);
			elems.title.removeEventListener('touchstart', StartMoveDialogHandler);

			ResizeDialogEndHandler();

			elems.resizer.removeEventListener('touchstart', StartResizeDialogHandler);
			elems.resizer.removeEventListener('mousedown', StartResizeDialogHandler);

			elems.formnode.removeEventListener('submit', SubmitHandler);

			elems.closebutton.removeEventListener('click', $this.Close);

			elems.mainwrap.removeEventListener('keydown', MainKeyHandler);

			for (var node in elems)
			{
				if (elems[node].parentNode)  elems[node].parentNode.removeChild(elems[node]);
			}

			currdialogstyle = null;

			// Remaining cleanup.
			elems = null;
			lastactiveelem = null;

			$this.settings = Object.assign({}, defaults);

			$this = null;
			parentelem = null;
			options = null;
		};
	};

	var AlertDialogInternal = function(title, content, closecallback, timeout) {
		var timer;

		var dlgoptions = {
			title: title,

			content: (typeof(content) !== 'string' ? content : {
				fields: [
					{
						type: 'custom',
						value: '<div class="staticwrap">' + EscapeHTML(Translate(content)).replaceAll('\n', '<br>\n') + '</div>'
					}
				],
				submit: ['OK'],
				submitname: 'submit'
			}),

			onsubmit: function(dlgformvars, dlgformnode, e, lastactivelem) {
				if (timer)  clearTimeout(timer);

				this.Destroy();

				lastactivelem.focus();

				if (typeof(closecallback) === 'function')  closecallback();
			},

			onclose: function(lastactivelem) {
				if (timer)  clearTimeout(timer);

				this.Destroy();

				lastactivelem.focus();

				if (typeof(closecallback) === 'function')  closecallback();
			}
		};

		var dlg = FlexForms.Dialog(document.body, dlgoptions);

		if (timeout > 0)  timer = setTimeout(function() { dlg.Close(); }, timeout);

		return dlg;
	};

	var ConfirmDialogInternal = function(title, content, yesbutton, nobutton, yescallback, nocallback, closecallback) {
		var dlgoptions = {
			title: title,

			content: (typeof(content) !== 'string' ? content : {
				fields: [
					{
						type: 'custom',
						value: '<div class="staticwrap">' + EscapeHTML(Translate(content)).replaceAll('\n', '<br>\n') + '</div>'
					}
				],
				submit: [yesbutton, nobutton],
				submitname: 'submit'
			}),

			onsubmit: function(dlgformvars, dlgformnode, e, lastactivelem) {
				this.Destroy();

				lastactivelem.focus();

				if (dlgformvars.submit === Translate(yesbutton))
				{
					if (typeof(yescallback) === 'function')  yescallback(1);
				}
				else
				{
					if (typeof(nocallback) === 'function')  nocallback(0);
				}
			},

			onclose: function(lastactivelem) {
				this.Destroy();

				lastactivelem.focus();

				if (typeof(closecallback) === 'function')  closecallback(-1);
				else if (typeof(nocallback) === 'function')  nocallback(-1);
			}
		};

		var dlg = FlexForms.Dialog(document.body, dlgoptions);

		return dlg;
	};

	window.FlexForms.Dialog = DialogInternal;
	window.FlexForms.Dialog.Alert = AlertDialogInternal;
	window.FlexForms.Dialog.Confirm = ConfirmDialogInternal;
})();
