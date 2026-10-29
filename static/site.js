(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('worksheet');
  if (form) {
    const params = new URLSearchParams(location.search);
    $('topic').value = params.get('topic') || '';
    $('questions-text').value = params.get('question') || '';
    // Remove the public article/question parameters after prefilling; user notes never enter URLs.
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
    const money = n => new Intl.NumberFormat('ja-JP', {maximumFractionDigits:0}).format(n) + '円';
    const val = id => Math.max(0, Number($(id).value) || 0);
    const calc = () => {
      const monthly = ['care','living','medical','other'].reduce((n,k) => n + val('monthly-'+k), 0);
      const gap = monthly - val('monthly-income');
      $('monthly-result').textContent = `月の支出合計 ${money(monthly)} ／ ${gap > 0 ? '不足額 ' + money(gap) : '収支の余り ' + money(-gap)}（空欄は0円で計算）`;
      const yearly = ['tax','insurance','utilities','management','travel'].reduce((n,k) => n + val('home-'+k), 0);
      $('home-result').textContent = `年間維持費 ${money(yearly)} ／ 5年間の支出見込み ${money(yearly*5+val('home-repair'))}（空欄は0円で計算）`;
    };
    form.addEventListener('input',calc);
    form.addEventListener('reset', e => {if(!confirm('入力したメモをすべて消しますか？')) e.preventDefault(); else setTimeout(calc,0);});
    $('print-notes').addEventListener('click',()=>window.print());
    $('save-notes').addEventListener('click',() => {
      const lines = ['親のこと、家族のこと。 相談・家族・費用のメモ',new Date().toLocaleDateString('ja-JP'),''];
      for(const el of form.querySelectorAll('input,textarea')) lines.push(el.name + '\n' + (el.value || '（未記入）') + '\n');
      lines.push($('monthly-result').textContent, $('home-result').textContent);
      const u = URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));
      const a = document.createElement('a');a.href=u;a.download='oyatokazoku-memo.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
      $('save-status').textContent='保存用ファイルを作成しました。端末のダウンロード先を確認してください。';
    });
    // Printed values remain visible even where native textarea printing would clip text.
    window.addEventListener('beforeprint',()=>{
      form.querySelectorAll('.print-value').forEach(e=>e.remove());
      form.querySelectorAll('input,textarea').forEach(el=>{const p=document.createElement('p');p.className='print-value';p.textContent=el.value || '　　　　　　　　　　　　　　　　　';el.after(p);});
    });
    calc();
  }
  const search=$('guide-search');
  if(search){
    let index;
    const render=()=>{
      if(!index)return;
      const q=search.value.trim();const list=$('search-results');list.replaceChildren();
      if(!q){$('search-status').textContent='';return;}
      const terms=q.split(/\s+/);const hits=index.filter(x=>terms.every(t=>(x.title+' '+x.text).includes(t)));
      $('search-status').textContent=hits.length ? `${hits.length}件の記事があります。` : '見つかりませんでした。言葉を短くするか、テーマ一覧から探してください。';
      for(const x of hits){const li=document.createElement('li'),a=document.createElement('a');a.href=x.url;a.textContent=x.title;li.append(a);list.append(li);}
    };
    search.addEventListener('input',render);
    fetch('/assets/search.json?v=20261028-1').then(r=>{if(!r.ok)throw Error();return r.json();}).then(x=>{index=x;render();}).catch(()=>{$('search-status').textContent='検索を読み込めませんでした。テーマ一覧から探してください。';});
  }
})();
