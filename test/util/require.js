window = window || this;
window.require = function(something) {
	// Only use relative paths ==> require('./lib/Something.js')
	if (typeof something === 'string' && something.indexOf('./') === 0 || something.indexOf('../') === 0) {
		var head = document && document.head;
		if (window.require.loading) {
			something = window.require.path + '/' + something;
		} else {
			var path = something.split('/');
			path.pop()
			window.require.path = path.join('/');
			window.require.loading = true;
			setTimeout(() => window.require.loading = false, 500);
		}
		if (head) {
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = something;
			head.appendChild(script);
		}
	}
}