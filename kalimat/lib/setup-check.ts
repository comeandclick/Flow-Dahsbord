export async function checkSetupRequired(supabaseUrl: string, anonKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/courses?limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
    })
    return res.status === 404 || res.status === 400
  } catch {
    return true
  }
}
