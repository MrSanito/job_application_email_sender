import fs from 'fs';
import path from 'path';

function getResumeAttachment() {
  const candidatePaths = [
    path.join(process.cwd(), 'public', 'Vishal_Nishad_Resume.pdf'),
    path.join(process.cwd(), 'public', 'resume.pdf'),
    path.join(process.cwd(), 'RealData', 'Vishal Resume 09_09_2026.pdf'),
    path.join(process.cwd(), 'RealData', 'resume.pdf'),
    path.join(process.cwd(), 'resume.pdf'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const stats = fs.statSync(p);
      return {
        found: true,
        filename: 'Vishal_Nishad_Resume.pdf',
        path: p,
        sizeBytes: stats.size,
        sizeKB: (stats.size / 1024).toFixed(1) + ' KB',
      };
    }
  }

  return { found: false };
}

const result = getResumeAttachment();
console.log('=====================================================');
console.log('📄 RESUME ATTACHMENT VERIFICATION RESULT:');
console.log('=====================================================');
console.log(JSON.stringify(result, null, 2));
console.log('=====================================================');
