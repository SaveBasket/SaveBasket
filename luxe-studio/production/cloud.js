import { supabase } from './supabase.js';

export const cloud = {
  enabled: Boolean(supabase),
  async session(){
    if(!supabase)return null;
    const {data}=await supabase.auth.getSession();
    return data?.session||null;
  },
  async signIn(email,password){
    if(!supabase)throw new Error('Cloud is not configured.');
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error)throw error;
    return data.session;
  },
  async signUp(email,password){
    if(!supabase)throw new Error('Cloud is not configured.');
    const {data,error}=await supabase.auth.signUp({email,password});
    if(error)throw error;
    return data.session;
  },
  async signOut(){if(supabase)await supabase.auth.signOut();},
  async saveProject(name,data){
    const session=await this.session();
    if(!session?.user)throw new Error('Sign in to save projects to the cloud.');
    const {data:existing,error:findError}=await supabase.from('projects').select('id,version').eq('user_id',session.user.id).eq('name',name).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(findError)throw findError;
    const payload={name,data:{...data,cloudSavedAt:new Date().toISOString()},version:(existing?.version||0)+1,updated_at:new Date().toISOString()};
    const result=existing
      ? await supabase.from('projects').update(payload).eq('id',existing.id).select().single()
      : await supabase.from('projects').insert({user_id:session.user.id,...payload}).select().single();
    if(result.error)throw result.error;
    return result.data;
  },
  async listProjects(){
    const session=await this.session();
    if(!session?.user)throw new Error('Sign in to browse cloud projects.');
    const {data,error}=await supabase.from('projects').select('id,name,version,updated_at').eq('user_id',session.user.id).order('updated_at',{ascending:false}).limit(30);
    if(error)throw error;
    return data||[];
  },
  async loadProject(id){
    const session=await this.session();
    if(!session?.user)throw new Error('Sign in to load cloud projects.');
    const {data,error}=await supabase.from('projects').select('id,name,data,version,updated_at').eq('id',id).eq('user_id',session.user.id).single();
    if(error)throw error;
    return data;
  }
};
