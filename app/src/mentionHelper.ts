import { supabase } from './lib/supabase'

export async function openMention(username: string, onOpenProfile: (id: string) => void) {
  const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
  if (data) onOpenProfile(data.id)
}
