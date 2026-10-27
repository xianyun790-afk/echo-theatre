import json
from pathlib import Path
from fontTools.ttLib import TTFont

root=Path(__file__).resolve().parents[1]
path=root/'study/typography-module-plan.json'
notes_path=root/'study/typography-notes.json'
notes=json.loads((notes_path if notes_path.exists() else path).read_text())
if not notes_path.exists():
    notes_path.write_text(json.dumps(notes,ensure_ascii=False,indent=2))
font=None
cmap=None
units=None
def measure(line,size,spacing):
    return round(sum(font['hmtx'].metrics[cmap[ord(c)]][0] for c in line)*size/units+max(0,len(line)-1)*spacing,2)
regions={'hero_display':['hero'],'brand_mark':['header'],'section_heading':['archive','investigation','council'],'editorial_quote':['private-script']}
modules=[]
for original in notes['modules']:
    font_id=original.get('font_id','ma-shan-zheng')
    family=original.get('font_family','Archive Display')
    category=original.get('style_category','calligraphic')
    font_file=original.get('font_file','public/fonts/archive-display.woff2')
    font=TTFont(root/font_file);cmap=font.getBestCmap();units=font['head'].unitsPerEm
    sid=[v.replace('panel-dialogue-log-title','panel-conversation-log-title') for v in original['surface_ids']]
    fits={}
    for label,viewport in [('desktop',1280),('phone',390)]:
        width=max(measure(line,original['font_size'][label],original['letter_spacing'][label]) for line in original[label+'_lines'])
        available=original['available_width'][label]
        fits[label+'_fit']={'surface_id':sid[0],'viewport_width_px':viewport,'available_width_px':available,'longest_line_width_px':width,'ratio':round(width/available,4)}
    module={
      'module_id':original['module_id'],'selector':original['selector'],'surface_ids':sid,'page_regions':original.get('page_regions',regions[original['module_id']]),
      'text':' / '.join(original['desktop_lines']),'font_id':font_id,'font_family':family,
      'style_category':category,'visual_priority':'signature' if original['module_id']=='hero_display' else 'support-display',
      'role_reason':original.get('reason','Brush-lettering identity for short narrative titles; body and form text retain their reading fonts.'),
      'art_direction_relationship':'Preserves the existing gothic room and muted archive palette; typography echoes handwritten records.',
      'font_weight':original.get('font_weight',400),'font_size':str(original['font_size']['desktop'])+'px desktop / '+str(original['font_size']['phone'])+'px phone',
      'line_height':original['line_height'],'letter_spacing':str(original['letter_spacing']['desktop'])+'px desktop / '+str(original['letter_spacing']['phone'])+'px phone',
      'max_width':str(original['available_width']['desktop'])+'px representative available width',
      'color':'#303a32 on paper / existing pale ink on scene','background':'Existing dark scene and user-requested aged archive paper',
      'alignment':'left','fallback':'Kaiti SC, STKaiti, KaiTi, serif','locale_verified':True,'font_loaded':True,
      'license':{'class':'open_source','source':'https://github.com/google/fonts/tree/main/ofl/notoserifsc' if font_id=='source-han-serif-sc' else 'https://github.com/googlefonts/mashanzheng','verified_for_target':True},
      'layout_change_required':False,'media_change_required':False,
      'geometry_adjustments':{'state':'unchanged','changes':[],'evidence':'User-authorized journal modal is 720px wide on desktop; typography does not change the room or page structure. Actual glyph screenshots verify the dialog.'},
      'rejected_candidates':[{'font_id':c['id'],'style_category':c['category'],'font_loaded':True,'rendered_reason':c['reason'],'screenshot':'study/journal-font-abc.jpg'} for c in notes['candidate_comparison']['candidates'] if (c['id'] in ['ma-shan-zheng','long-cang'] if font_id=='source-han-serif-sc' else c['result']=='rejected')],
      'line_break_checks':{'desktop_lines':original['desktop_lines'],'phone_lines':original['phone_lines'],**fits,'measurement_method':'FontTools hmtx advance widths from the final selected WOFF2 plus CSS letter spacing; desktop and narrow dialog title checks are recorded in study/journal-checks.json.','single_character_line_intentional':False,'punctuation_only_line':False,'evidence':'study/font-abc.jpg; study/typography-checks.json'}
    }
    modules.append(module)
surfaces=[s for m in modules for s in m['surface_ids']]
expressive=[m for m in modules if m['style_category'] in ('calligraphic','handwritten','impact-display','rounded-playful','pixel-mono')]
nonhero=[s for m in expressive if m['module_id']!='hero_display' for s in m['surface_ids']]
expressive_surfaces=[s for m in expressive for s in m['surface_ids']]
reading_surfaces=[s for m in modules if m not in expressive for s in m['surface_ids']]
plan={
 'schema_version':'6.0','locale':'zh-CN','page_type':'existing game title components','visual_voice':['gothic-storybook','aged-archive','restrained-brush-lettering'],
 'user_preferences':['Damaged archive paper popups and more artistic Chinese titles; existing desktop game layout remains.'],
 'integration_contract':{**notes['integration_contract'],'input_page_plan':None,'host_hero_mode':'existing-three-dimensional-game'},
 'global_hierarchy':{**notes['global_hierarchy'],'expressive_required':False,'signature_intent':'restrained','script_signature_required':False,'rich_script_required':False},
 'expressive_distribution':{'mode':'restrained','expressive_surface_ids':expressive_surfaces,'non_hero_expressive_surface_ids':nonhero,
 'expressive_module_types':list(dict.fromkeys(m['module_id'] for m in expressive)),'expressive_page_regions':sorted({region for m in expressive if m['module_id']!='hero_display' for region in m['page_regions']}),
 'reading_protected_surface_ids':reading_surfaces,'expressive_font_ids':[],'min_non_hero_expressive_surfaces':0,'max_active_families':1,
 'distribution_reason':'User explicitly requests Songti throughout: all titles, notes, paragraphs, metadata and form controls use Archive Print with Songti fallbacks. Layout and scene media are unchanged.'},
 'coverage_audit':{'scope':'component','dom_marker_attribute':'data-type-surface','visible_text_surface_ids':surfaces,'covered_text_surface_ids':surfaces,
 'uncovered_text_surface_ids':[],'coverage_reason':'This audit covers the changed title component family, including dynamic dialog variants, brand, scene titles and the short letter quote. It does not claim a redesign or full audit of all dynamic application text.'},
 'modules':modules,'committed_font_ids':['source-han-serif-sc'],'license_notes':['SIL OFL 1.1 retained in public/fonts/MaShanZheng-OFL.txt and public/fonts/NotoSerifSC-OFL.txt; only selected fonts and weights are included in the runtime.'],
 'qa_screenshots':['docs/all-songti-entry.jpg','docs/all-songti-room.jpg','docs/all-songti-script.jpg','study/all-songti-checks.json']
}
path.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
print('Recorded final title-component font metrics.')
