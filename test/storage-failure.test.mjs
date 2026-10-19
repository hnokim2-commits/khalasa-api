import test from 'node:test';
import assert from 'node:assert/strict';
import {storageFailureCode} from '../src/storage-failure.mjs';
test('storage error classifications never echo provider details',()=>{
 assert.equal(storageFailureCode(400,{message:'Invalid JWT secret-example'}),'PRIVATE_STORAGE_UPLOAD_FAILED_400_INVALID_KEY');
 assert.equal(storageFailureCode(400,{message:'Bucket not found private/path'}),'PRIVATE_STORAGE_UPLOAD_FAILED_400_BUCKET_NOT_FOUND');
 assert.equal(storageFailureCode(403,{message:'new row violates row-level security policy'}),'PRIVATE_STORAGE_UPLOAD_FAILED_403_ACCESS_DENIED');
 assert.equal(storageFailureCode(400,{message:'mime type not supported'}),'PRIVATE_STORAGE_UPLOAD_FAILED_400_MIME_REJECTED');
 assert.equal(storageFailureCode(500,{message:'secret-example private/path'}),'PRIVATE_STORAGE_UPLOAD_FAILED_500_UNCLASSIFIED');
 assert.equal(storageFailureCode(undefined,null),'PRIVATE_STORAGE_UPLOAD_FAILED_500_UNCLASSIFIED');
});
