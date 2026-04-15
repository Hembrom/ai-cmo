import axios from "axios";
import type { DateRange } from "./facebook-analytics";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function fetchInstagramOverview(igId: string, pageToken: string) {
  const { data } = await axios.get(`${GRAPH}/${igId}`, {
    params: {
      access_token: pageToken,
      fields: "id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website",
    },
  });

  return {
    ig_id:       data.id,
    name:        data.name,
    username:    data.username,
    biography:   data.biography,
    followers:   data.followers_count    || 0,
    following:   data.follows_count      || 0,
    total_posts: data.media_count        || 0,
    profile_pic: data.profile_picture_url || null,
    website:     data.website            || null,
  };
}

export async function fetchInstagramInsights(
  igId: string,
  pageToken: string,
  dateRange: DateRange
): Promise<Record<string, { date: string; value: number }[]>> {
  const since = Math.floor(new Date(dateRange.start).getTime() / 1000);
  const until = Math.floor(new Date(dateRange.end).getTime() / 1000);

  const metricGroups = [
    ["reach", "impressions", "profile_views"],
    ["follower_count"],
  ];

  const allData: Record<string, { date: string; value: number }[]> = {};

  for (const metrics of metricGroups) {
    const { data } = await axios.get(`${GRAPH}/${igId}/insights`, {
      params: {
        access_token: pageToken,
        metric:       metrics.join(","),
        period:       "day",
        since,
        until,
      },
    });

    for (const item of data.data || []) {
      allData[item.name] = item.values.map((v: { end_time: string; value: number }) => ({
        date:  v.end_time.split("T")[0],
        value: v.value,
      }));
    }
  }

  return allData;
}

export async function fetchInstagramAudience(igId: string, pageToken: string) {
  const audienceMetrics = ["audience_gender_age", "audience_city", "audience_country"];

  const { data } = await axios.get(`${GRAPH}/${igId}/insights`, {
    params: {
      access_token: pageToken,
      metric:       audienceMetrics.join(","),
      period:       "lifetime",
    },
  });

  const audience: Record<string, Record<string, number>> = {};
  for (const item of data.data || []) {
    audience[item.name] = item.values?.[0]?.value || {};
  }

  const genderAge = audience.audience_gender_age || {};
  const formatted = Object.entries(genderAge).map(([key, count]) => {
    const [gender, age_range] = key.split(".");
    return { gender, age_range, count };
  });

  const cities = Object.entries(audience.audience_city || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([city, count]) => ({ city, count }));

  const countries = Object.entries(audience.audience_country || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }));

  return { gender_age: formatted, top_cities: cities, top_countries: countries };
}

export async function fetchInstagramTopPosts(
  igId: string,
  pageToken: string,
  dateRange: DateRange
) {
  const { data } = await axios.get(`${GRAPH}/${igId}/media`, {
    params: {
      access_token: pageToken,
      fields: "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink",
      limit: 50,
    },
  });

  const since = new Date(dateRange.start).getTime();
  const until = new Date(dateRange.end).getTime();

  const posts = (data.data || [])
    .filter((p: any) => {
      const t = new Date(p.timestamp).getTime();
      return t >= since && t <= until;
    })
    .map(async (p: any) => {
      let postInsights = { reach: 0, impressions: 0, saved: 0 };
      try {
        const ir = await axios.get(`${GRAPH}/${p.id}/insights`, {
          params: { access_token: pageToken, metric: "reach,impressions,saved" },
        });
        for (const item of ir.data.data || []) {
          (postInsights as any)[item.name] = item.values?.[0]?.value || 0;
        }
      } catch { /* insights unavailable for some media types */ }

      return {
        id:          p.id,
        caption:     p.caption?.slice(0, 120) || "",
        media_type:  p.media_type,
        media_url:   p.media_url || p.thumbnail_url || null,
        timestamp:   p.timestamp,
        likes:       p.like_count      || 0,
        comments:    p.comments_count  || 0,
        reach:       postInsights.reach,
        impressions: postInsights.impressions,
        saved:       postInsights.saved,
        permalink:   p.permalink,
        engagement:  (p.like_count || 0) + (p.comments_count || 0) + postInsights.saved,
      };
    });

  const resolved = await Promise.all(posts);
  return resolved.sort((a: any, b: any) => b.engagement - a.engagement).slice(0, 10);
}

export async function fetchInstagramStories(igId: string, pageToken: string) {
  const { data } = await axios.get(`${GRAPH}/${igId}/stories`, {
    params: {
      access_token: pageToken,
      fields: "id,media_type,media_url,timestamp",
      limit: 20,
    },
  });

  const stories = await Promise.all(
    (data.data || []).map(async (s: any) => {
      let storyInsights = { reach: 0, impressions: 0, replies: 0 };
      try {
        const ir = await axios.get(`${GRAPH}/${s.id}/insights`, {
          params: { access_token: pageToken, metric: "reach,impressions,replies" },
        });
        for (const item of ir.data.data || []) {
          (storyInsights as any)[item.name] = item.values?.[0]?.value || 0;
        }
      } catch { /* story may have expired */ }

      return { ...s, ...storyInsights };
    })
  );

  return stories;
}

export async function fetchAllInstagramAnalytics(
  igId: string,
  pageToken: string,
  dateRange: DateRange
) {
  const [overview, insights, audience, topPosts, stories] = await Promise.all([
    fetchInstagramOverview(igId, pageToken),
    fetchInstagramInsights(igId, pageToken, dateRange),
    fetchInstagramAudience(igId, pageToken),
    fetchInstagramTopPosts(igId, pageToken, dateRange),
    fetchInstagramStories(igId, pageToken),
  ]);

  const sumValues = (arr: { value: number }[] = []) =>
    arr.reduce((s, v) => s + (v.value || 0), 0);

  return {
    platform: "instagram",
    ig_id:    igId,
    overview,
    summary: {
      total_reach:       sumValues(insights.reach),
      total_impressions: sumValues(insights.impressions),
      profile_views:     sumValues(insights.profile_views),
      follower_growth:   insights.follower_count?.at(-1)?.value || overview.followers,
    },
    time_series: insights,
    audience,
    top_posts:   topPosts,
    stories,
  };
}
