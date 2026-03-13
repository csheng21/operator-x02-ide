f=r"src/ide/terminal/autoFormatErrors.ts"
c=open(f,encoding="utf-8").read()
c=c.replace("console.log('⏳ Will keep trying every 2 seconds until ready...');","# suppressed")
c=c.replace("console.log('🚀 Will keep trying for 60 seconds...');","# suppressed")
open(f,"w",encoding="utf-8").write(c)
print("Done")
