from django import forms


class UserForm(forms.Form):
    username = forms.CharField(label="用户名", max_length=128, widget=forms.TextInput(
        attrs={'class': 'form-control', 'placeholder': 'Username', 'autofocus': True,
               'style': 'font-size:12px; font-family:Arial'}))
    password = forms.CharField(label="密码", max_length=256,
                               widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Password',
                                                                 'style': 'font-size:12px; font-family:Arial'}))

    def focus_on_password(self):
        self.fields['username'].widget.attrs['autofocus'] = False
        self.fields['password'].widget.attrs['autofocus'] = True


class RegisterForm(forms.Form):
    username = forms.CharField(label="用户名", max_length=128,
                               widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Username',
                                                             'style': 'font-size:12px; font-family:Arial',
                                                             'autofocus': True}))
    password1 = forms.CharField(label="密码", max_length=256,
                                widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Password',
                                                                  'style': 'font-size:12px; font-family:Arial'}))
    password2 = forms.CharField(label="确认密码", max_length=256,
                                widget=forms.PasswordInput(
                                    attrs={'class': 'form-control', 'placeholder': 'Password(repeat)',
                                           'style': 'font-size:12px; font-family:Arial'}))
