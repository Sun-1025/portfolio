import zipfile, re
p = r"C:\Users\sun\OneDrive\Desktop\实习\孙志昊-山东石油化工学院-项目实习生（技术方向）-腾讯.docx"
z = zipfile.ZipFile(p)
x = z.read('word/document.xml').decode('utf-8')
x = x.replace('</w:p>', '</w:p>\n')
x = re.sub(r'<[^>]+>', '', x)
x = re.sub(r'\n{3,}', '\n\n', x)
print(x[:9000])
