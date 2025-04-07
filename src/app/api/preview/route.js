export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const apiKey = process.env.LINKPREVIEW_API_KEY;
  
    if (!url) {
      return new Response(JSON.stringify({ error: 'Falta la URL' }), { status: 400 });
    }
  
    try {
      const res = await fetch(`https://api.linkpreview.net/?key=${apiKey}&q=${encodeURIComponent(url)}`);
      const data = await res.json();
  
      if (data.error) {
        return new Response(JSON.stringify({ error: data.error }), { status: 400 });
      }
  
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Error en el servidor' }), { status: 500 });
    }
  }
  