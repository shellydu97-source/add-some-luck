import { createDeleteAccountHandler } from './handler.ts'
declare const Deno: { env: { get(name:string):string|undefined }; serve(handler:(request:Request)=>Promise<Response>):void }
Deno.serve(createDeleteAccountHandler({SUPABASE_URL:Deno.env.get('SUPABASE_URL') ?? '',SUPABASE_ANON_KEY:Deno.env.get('SUPABASE_ANON_KEY') ?? '',SUPABASE_SERVICE_ROLE_KEY:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',APP_ORIGIN:Deno.env.get('APP_ORIGIN') ?? ''}))
