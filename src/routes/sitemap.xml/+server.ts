import type { RequestHandler } from './$types';

const site = 'https://bullgaze.com';

const staticPages = [
	{
		url: '',
		lastmod: new Date().toISOString().split('T')[0],
		changefreq: 'daily',
		priority: '1.0'
	},
	{
		url: '/calculator',
		lastmod: new Date().toISOString().split('T')[0],
		changefreq: 'weekly',
		priority: '0.9'
	}
];

export const GET: RequestHandler = async () => {
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
	.map(
		(page) => `  <url>
    <loc>${site}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml'
		}
	});
};
