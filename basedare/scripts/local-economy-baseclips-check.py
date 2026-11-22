import copy, hashlib, json, pathlib, shutil, sys, tempfile
from jsonschema import Draft202012Validator
reference=pathlib.Path(sys.argv[1]).resolve()
sys.path.insert(0,str(reference))
from baseclips import basedare as b, workspace as w
from baseclips.db import Store
packet=json.loads(pathlib.Path(sys.argv[2]).read_text())
media=pathlib.Path(sys.argv[3]).resolve()
schema=json.loads(pathlib.Path(sys.argv[4]).read_text())
assert schema == json.loads((reference/'schemas/basedare-media-v1.json').read_text())
payload=packet['payload']; key=b'fixture-only-distinct-local-media-signing-secret'
envelope=b.sign(payload,key)
Draft202012Validator(schema).validate(envelope)
assert b.verify(envelope,key,payload['tenant_id']) == payload
b.validate_grant(payload['grant'],payload['media_sha256'],'processing')
for scope in ('publication','evaluation','training'):
    try: b.validate_grant(payload['grant'],payload['media_sha256'],scope)
    except ValueError: pass
    else: raise AssertionError('Implicit '+scope+' permission')
assert hashlib.sha256(media.read_bytes()).hexdigest()==payload['media_sha256']
with tempfile.TemporaryDirectory(prefix='basedare-contract-') as root:
    root=pathlib.Path(root); store=Store(root/'baseclips'); incoming=root/'incoming'; incoming.mkdir()
    brief={**w.channel(store,w.ENGINEERING)['data'],'name':'Isolated BaseDare fixture','version':1}
    store.execute('INSERT INTO channels VALUES(?,?,?,?)',(b.BASEDARE_CHANNEL,json.dumps(brief),0,0))
    shutil.copyfile(media,incoming/(payload['media_sha256']+'.mp4'))
    receipt=b.ingest(store,envelope,key,payload['tenant_id'],incoming)
    assert receipt==b.ingest(store,b.sign(payload,key),key,payload['tenant_id'],incoming)
    assert not receipt['training_allowed'] and not receipt['evaluation_allowed']
    assert len(store.rows('SELECT * FROM projects'))==1
    revoked=b.revoke(store,b.sign(packet['withdrawal'],key),key,payload['tenant_id'])
    assert receipt['project_id'] in revoked['affected_projects']
    assert store.one('SELECT * FROM jobs WHERE id=?',(receipt['job_id'],))['status']=='cancelled'
print('PASS: exact BaseClips v1 schema, actual signed receiver ingest with real synthetic MP4, idempotency, processing-only scope and local queued-job revocation. No provider, rendering or public publication claim.')
