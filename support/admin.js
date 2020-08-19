$(function() {
	// For handling menu scroll.
	function GetScrollLineHeight() {
		var iframe = document.createElement('iframe');
		iframe.src = '#';
		document.body.appendChild(iframe);
		var iwin = iframe.contentWindow;
		var idoc = iwin.document;
		idoc.open();
		idoc.write('<!DOCTYPE html><html><head></head><body><span>a</span></body></html>');
		idoc.close();
		var span = idoc.body.firstElementChild;
		var r = span.offsetHeight;
		document.body.removeChild(iframe);

		return r;
	}

	var scrolllineheight = GetScrollLineHeight();
	var showingmenu = false;

	$('.proptitlewrap').after($('<div id="navoverflowwrap"></div>').click(function() {
		$('#menuwrap').toggleClass('showmenu');
		$('#contentwrap').toggleClass('showmenu');

		showingmenu = !showingmenu;
	}));

	$('#navbutton').click(function() {
		$('#menuwrap').toggleClass('showmenu');
		$('#contentwrap').toggleClass('showmenu');

		showingmenu = !showingmenu;
	});

	var scrolltarget = $('#contentwrap').get(0);

	$('#menuwrap').on('wheel', function(e) {
		var $this = $(this);

		if (!showingmenu && $this.get(0).scrollHeight <= $this.innerHeight())
		{
			var o = e.originalEvent;
			var mult = (o.deltaMode == 1 ? scrolllineheight * 2 : (o.deltaMode == 2 ? $(window).height() - (2 * scrolllineheight) : 1));

			scrolltarget.scrollTop += o.deltaY * mult;
			scrolltarget.scrollLeft += o.deltaX * mult;
		}
	});

	$('#contentwrap').focus();
});