//////////////////////////////////////////////////////////////////////
//  (c) 2025 David 'Duppy' Proctor, Interface Arts
//      Dev widgets - show version and branch name
//////////////////////////////////////////////////////////////////////

fetch('version.dev.txt', { cache: 'no-store' })
	.then(res => {
		if (res.ok) return res.text()
		return Promise.reject()
	})
	.then(version => {
		version = version.trim().substring(0, 169) // limit to 169 chars to guard against overflowing DOM and some XSS
		// eslint-disable-next-line no-unsanitized/property -- This is for dev only local hosting
		// I am aware that textContent is safer, this is for dev only local hosting
		document.querySelector('.version-widget').innerHTML = `${version}`
	})
	.catch(() => {})

fetch('branch_name.dev.txt', { cache: 'no-store' })
	.then(res => {
		if (res.ok) return res.text()
		return Promise.reject()
	})
	.then(branch_name => {
		branch_name = branch_name.trim().substring(0, 169)
		document.querySelector('.branch-widget').textContent = `${branch_name}`
 	})
	.catch(() => {})