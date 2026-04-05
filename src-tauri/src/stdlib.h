{ class="string">"command": class="string">"ide_patch", class="string">"args": { class="string">"file_path": class="string">"hello.c", class="string">"find": class="string">"class="comment">#include <stdio.h>

int main() {
    printf("Hello, World!\
\class="string">");
    return class="number">0;
}
", class="string">"replace": class="string">"#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("Hello, World!\
\class="string">");
    printf("Welcome to C programming!\
\class="string">");
    return EXIT_SUCCESS;
}
", class="string">"description": class="string">"Enhanced hello world with additional output and better exit code" } }