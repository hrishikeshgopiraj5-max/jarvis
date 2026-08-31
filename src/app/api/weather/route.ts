import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'London';

  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Weather API key not configured.',
        setup: 'Add OPENWEATHER_API_KEY to your .env.local file. Get a free key at https://openweathermap.org/api',
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'City not found or API error.' }, { status: 404 });
    }

    const data = await res.json();

    return NextResponse.json({
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      description: data.weather[0]?.description || 'Unknown',
      icon: data.weather[0]?.icon || '01d',
      main: data.weather[0]?.main || 'Unknown',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch weather data.' }, { status: 500 });
  }
}
