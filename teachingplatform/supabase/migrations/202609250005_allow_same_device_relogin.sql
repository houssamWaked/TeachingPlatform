create or replace function public.redeem_access_code(
  p_code text,
  p_device_id text,
  p_token_hash text,
  p_student_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_code public.codes;
  v_student public.students;
  v_student_name text := regexp_replace(trim(coalesce(p_student_name, '')), '\s+', ' ', 'g');
begin
  if v_student_name = '' or char_length(v_student_name) > 80 then
    raise exception 'INVALID_STUDENT_NAME' using errcode = 'P0001';
  end if;

  select * into v_code
  from public.codes
  where upper(code) = upper(trim(p_code))
  for update;
  if not found then raise exception 'INVALID_CODE' using errcode = 'P0001'; end if;

  if v_code.is_used then
    select * into v_student from public.students where id = v_code.used_by for update;
    if v_student.device_id is not null and v_student.device_id <> p_device_id then
      raise exception 'CODE_ALREADY_USED' using errcode = 'P0001';
    end if;
    update public.students
    set device_id = p_device_id,
        device_locked_at = coalesce(device_locked_at, now()),
        session_token = p_token_hash,
        name = case when name = 'Student' then v_student_name else name end
    where id = v_student.id;
    return v_student.id;
  end if;

  insert into public.students(code_id, device_id, device_locked_at, session_token, name)
  values(v_code.id, p_device_id, now(), p_token_hash, v_student_name)
  returning id into v_student.id;
  update public.codes set is_used = true, used_by = v_student.id where id = v_code.id;
  return v_student.id;
end;
$$;

revoke all on function public.redeem_access_code(text, text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_access_code(text, text, text, text) to service_role;
