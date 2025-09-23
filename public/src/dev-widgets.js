//////////////////////////////////////////////////////////////////////
//  (c) 2025 David 'Duppy' Proctor, Interface Arts
//      Dev widgets - show version and branch name
//////////////////////////////////////////////////////////////////////

fetch('version.txt', { cache: 'no-store' })
	.then(res => {
		if (res.ok) return res.text()
		return Promise.reject()
	})
	.then(version => {
		version = version.trim().substring(0, 169)
		document.querySelector('.version-widget').innerHTML = `${version}`
	})
	.catch(() => {})

fetch('branch_name.txt', { cache: 'no-store' })
	.then(res => {
		if (res.ok) return res.text()
		return Promise.reject()
	})
	.then(branch_name => {
		branch_name = branch_name.trim().substring(0, 169)
		document.querySelector('.branch-widget').textContent = `${branch_name}`
 	})
	.catch(() => {})