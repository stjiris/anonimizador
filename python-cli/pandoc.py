import click
import pypandoc
import sys

sys.stdin.reconfigure(encoding='utf-8') # might not be needed outside windows world
sys.stdout.reconfigure(encoding='utf-8')

@click.command()
@click.argument('filename', type=click.Path(exists=True))
def pandoc(filename):
	html = ""
	file_extension = "."+filename.split(".")[-1]
	if file_extension == ".txt":
		html = pypandoc.convert_file(filename, "html", format="md", extra_args=["--self-contained","--wrap","none"])
	else:
		html = pypandoc.convert_file(filename, "html", extra_args=["--self-contained","--wrap","none"])
	print(html)


if __name__ == "__main__":
	pandoc()