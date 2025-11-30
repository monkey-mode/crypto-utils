package encrypt

import (
	"encoding/base64"

	"github.com/pkg/errors"
)

//go:generate mockery --outpkg=encrypt --name=EncryptAES --output=. --filename=aes_mock.go --structname=MockEncryptAES --inpackage
type EncryptAES interface {

	// Encrypt with provided nonce
	EncryptWithNonce(key, nonce, data string) (string, error)
	EncryptFileWithNonce(key, nonce string, inputFilePath, outputFilePath string) error

	// Encrypt with auto-generated nonce (appended to ciphertext)
	Encrypt(key string, data string) (string, error)
	EncryptFile(key string, inputFilePath, outputFilePath string) error
}

type encryptAESImpl struct{}

func NewEncryptAES() EncryptAES {
	return &encryptAESImpl{}
}

func (ecp *encryptAESImpl) EncryptWithNonce(key, nonce, data string) (string, error) {
	result, err := ecp.encryptAES256GCM([]byte(key), []byte(nonce), []byte(data), false)
	if err != nil {
		return "", errors.Wrap(err, "Encrypt AES256GCM error")
	}

	return base64.StdEncoding.EncodeToString(result), nil
}

func (ecp *encryptAESImpl) EncryptFileWithNonce(key, nonce, inputFilePath, outputFilePath string) error {
	err := ecp.encryptFileAES256GCM([]byte(key), []byte(nonce), inputFilePath, outputFilePath, false)
	if err != nil {
		return errors.Wrap(err, "Encrypt file error")
	}

	return nil
}

func (ecp *encryptAESImpl) Encrypt(key, data string) (string, error) {
	result, err := ecp.encryptAES256GCM([]byte(key), nil, []byte(data), true)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(result), nil
}

func (ecp *encryptAESImpl) EncryptFile(key, inputFilePath, outputFilePath string) error {
	err := ecp.encryptFileAES256GCM([]byte(key), nil, inputFilePath, outputFilePath, true)
	if err != nil {
		return err
	}

	return nil
}
