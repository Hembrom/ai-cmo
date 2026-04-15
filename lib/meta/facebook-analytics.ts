import axios from "axios";

const GRAPH = "https://graph.facebook.com/v21.0";

const PAGE_INSIGHT_METRICS = [
  "page_fans",
  "page_fan_adds",
  "page_impressions",
  "page_impressions_unique",
  "page_engaged_users",
  "page_post_engagements",
  "page_views_total",
].join(",");

export interface DateRange {
  start: string;
  end: string;
}

interface InsightValue {
  date: string;
  value: number;
}

export async function fetchFacebookPageOverview(pageId: string, pageToken: string) {
  const { data } = await axios.get(`${GRAPH}/${pageId}`, {
    params: {
      access_token: pageToken,
      fields: "id,name,fan_count,followers_count,talking_about_count",
    },
  });

  return {
    page_id:         data.id,
    name:            data.name,
    total_fans:      data.fan_count       || 0,
    total_followers: data.followers_count || 0,
    talking_about:   data.talking_about_count || 0,
  };
}

export async function fetchFacebookInsights(
  pageId: string,
  pageToken: string,
  dateRange: DateRange
): Promise<Record<string, InsightValue[]>> {
  const since = Math.floor(new Date(dateRange.start).getTime() / 1000);
  const until = Math.floor(new Date(dateRange.end).getTime() / 1000);

  const { data } = await axios.get(`${GRAPH}/${pageId}/insights`, {
    params: {
      access_token: pageToken,
      metric:       PAGE_INSIGHT_METRICS,
      period:       "day",
      since,
      until,
    },
  });

  const insights: Record<string, InsightValue[]> = {};
  for (const item of data.data || []) {
    insights[item.name] = item.values.map((v: { end_time: string; value: number }) => ({
      date:  v.end_time.split("T")[0],
      value: v.value,
    }));
  }

  return insights;
}

export async function fetchFacebookTopPosts(
  pageId: string,
  pageToken: string,
  dateRange: DateRange
) {
  const since = Math.floor(new Date(dateRange.start).getTime() / 1000);
  const until = Math.floor(new Date(dateRange.end).getTime() / 1000);

  const { data } = await axios.get(`${GRAPH}/${pageId}/posts`, {
    params: {
      access_token: pageToken,
      fields: "id,message,created_time,likes.summary(true),comments.summary(true),shares,full_picture",
      since,
      until,
      limit: 50,
    },
  });

  const posts = (data.data || []).map((p: any) => ({
    id:           p.id,
    message:      p.message?.slice(0, 120) || "",
    created_time: p.created_time,
    likes:        p.likes?.summary?.total_count    || 0,
    comments:     p.comments?.summary?.total_count || 0,
    shares:       p.shares?.count                  || 0,
    image:        p.full_picture                   || null,
    engagement:   (p.likes?.summary?.total_count    || 0) +
                  (p.comments?.summary?.total_count || 0) +
                  (p.shares?.count                  || 0),
  }));

  return posts.sort((a: any, b: any) => b.engagement - a.engagement).slice(0, 10);
}

export async function fetchAllFacebookAnalytics(
  pageId: string,
  pageToken: string,
  dateRange: DateRange
) {
  const [overview, insights, topPosts] = await Promise.all([
    fetchFacebookPageOverview(pageId, pageToken),
    fetchFacebookInsights(pageId, pageToken, dateRange),
    fetchFacebookTopPosts(pageId, pageToken, dateRange),
  ]);

  const sumValues = (arr: InsightValue[] = []) =>
    arr.reduce((s, v) => s + (v.value || 0), 0);

  return {
    platform: "facebook",
    page_id:  pageId,
    overview,
    summary: {
      new_fans:            sumValues(insights.page_fan_adds),
      total_reach:         sumValues(insights.page_impressions_unique),
      total_impressions:   sumValues(insights.page_impressions),
      total_engagements:   sumValues(insights.page_post_engagements),
      page_views:          sumValues(insights.page_views_total),
    },
    time_series: insights,
    top_posts:   topPosts,
  };
}
